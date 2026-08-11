(() => {
  const config = window.SUPABASE_CONFIG;
  const factory = window.supabase?.createClient;
  if (!config?.url || !config?.publishableKey || !factory) {
    console.warn('Supabase 尚未載入，系統維持本機模式。');
    return;
  }

  const rememberDurationMs = 30 * 24 * 60 * 60 * 1000;
  const rememberUntilKey = 'funeral-cloud-remember-until-v1';
  const projectReference = new URL(config.url).hostname.split('.')[0];
  const authStorageKey = `sb-${projectReference}-auth-token`;
  const storedRememberUntil = Number(localStorage.getItem(rememberUntilKey) || 0);
  let rememberSession = storedRememberUntil > Date.now();
  if (!rememberSession && storedRememberUntil) {
    localStorage.removeItem(rememberUntilKey);
    localStorage.removeItem(authStorageKey);
    localStorage.removeItem(`${authStorageKey}-code-verifier`);
  } else if (!storedRememberUntil && localStorage.getItem(authStorageKey)) {
    // 舊版原本會永久保留登入；升級後從第一次開啟起改為最多保留 30 天。
    rememberSession = true;
    localStorage.setItem(rememberUntilKey, String(Date.now() + rememberDurationMs));
  }
  const setRememberSession = enabled => {
    rememberSession = Boolean(enabled);
    if (rememberSession) {
      localStorage.setItem(rememberUntilKey, String(Date.now() + rememberDurationMs));
      return;
    }
    localStorage.removeItem(rememberUntilKey);
    localStorage.removeItem(authStorageKey);
    localStorage.removeItem(`${authStorageKey}-code-verifier`);
  };
  const authStorage = {
    getItem: key => (rememberSession ? localStorage : sessionStorage).getItem(key),
    setItem: (key, value) => {
      const target = rememberSession ? localStorage : sessionStorage;
      const other = rememberSession ? sessionStorage : localStorage;
      target.setItem(key, value);
      other.removeItem(key);
    },
    removeItem: key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
      if (key === authStorageKey) {
        rememberSession = false;
        localStorage.removeItem(rememberUntilKey);
      }
    }
  };
  const cloud = factory(config.url, config.publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: authStorageKey,
      storage: authStorage
    }
  });
  const recordsKey = 'funeral-case-records-v1';
  const companyRecordsKey = companyId => `${recordsKey}:company:${companyId}`;
  const deletedCasesKey = companyId => `funeral-case-deleted-v2:company:${companyId}`;
  const unscopedBackupKey = userId => `${recordsKey}:unscoped-backup:${userId}`;
  let activeCompanyId = '';
  let activeUser = null;
  let activeRole = '';
  let activeReadOnly = false;
  let syncing = false;
  const passwordResetMode = 'reset-password';
  let passwordRecoveryActive =
    new URLSearchParams(window.location.search).get('mode') === passwordResetMode;
  const passwordResetRedirectUrl = (() => {
    if (window.location.protocol === 'file:') {
      return 'https://0970104119.netlify.app/?mode=reset-password';
    }
    const redirectUrl = new URL(window.location.href);
    redirectUrl.search = '';
    redirectUrl.hash = '';
    redirectUrl.searchParams.set('mode', passwordResetMode);
    return redirectUrl.toString();
  })();

  const readRecordsFromKey = key => {
    try {
      const records = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(records) ? records : [];
    } catch {
      return [];
    }
  };

  const readDisplayRecords = () => readRecordsFromKey(recordsKey);
  const readLocalRecords = () =>
    activeCompanyId ? readRecordsFromKey(companyRecordsKey(activeCompanyId)) : [];
  const writeDisplayRecords = records => {
    localStorage.setItem(recordsKey, JSON.stringify(records));
  };
  const writeCompanyLocalRecords = records => {
    if (!activeCompanyId) return;
    localStorage.setItem(companyRecordsKey(activeCompanyId), JSON.stringify(records));
  };
  const writeLocalRecords = records => {
    writeCompanyLocalRecords(records);
    writeDisplayRecords(records);
  };
  const backupUnscopedRecords = () => {
    if (!activeUser) return;
    const backupKey = unscopedBackupKey(activeUser.id);
    if (localStorage.getItem(backupKey) !== null) return;
    const records = readDisplayRecords();
    if (records.length) localStorage.setItem(backupKey, JSON.stringify(records));
  };

  const readDeletedCaseNumbers = () => {
    if (!activeCompanyId) return new Set();
    try {
      const rows = JSON.parse(localStorage.getItem(deletedCasesKey(activeCompanyId)) || '[]');
      return new Set((Array.isArray(rows) ? rows : []).map(String).filter(Boolean));
    } catch {
      return new Set();
    }
  };

  const markCaseDeleted = caseNo => {
    const number = String(caseNo || '').trim();
    if (!number || !activeCompanyId) return;
    const rows = readDeletedCaseNumbers();
    rows.add(number);
    localStorage.setItem(deletedCasesKey(activeCompanyId), JSON.stringify([...rows]));
  };

  const clearDeletedCase = caseNo => {
    const number = String(caseNo || '').trim();
    if (!number || !activeCompanyId) return;
    try {
      const rows = readDeletedCaseNumbers();
      rows.delete(number);
      localStorage.setItem(deletedCasesKey(activeCompanyId), JSON.stringify([...rows]));
    } catch {
      // 無法讀取本機標記時，不影響雲端資料。
    }
  };

  const deleteCloudCase = async caseNo => {
    const number = String(caseNo || '').trim();
    if (!number) return;
    if (activeReadOnly) throw new Error('此帳號僅可瀏覽，不能刪除案件。');
    // 先留下本機刪除標記；即使網路暫時失敗，也不會在重新整理後把案件又帶回來。
    if (!activeCompanyId) {
      const rows = readDisplayRecords().filter(record =>
        String(record?.fields?.case_no || '').trim() !== number
      );
      writeDisplayRecords(rows);
      return;
    }
    const rows = readDisplayRecords().filter(record =>
      String(record?.fields?.case_no || '').trim() !== number
    );
    writeLocalRecords(rows);
    markCaseDeleted(number);
    const { error } = await cloud
      .from('cases')
      .delete()
      .eq('company_id', activeCompanyId)
      .eq('case_no', number);
    if (error) throw error;
    // 保留刪除標記，避免瀏覽器快取或延遲回應把已刪案件重新帶回。
    // 若日後以相同案號新建案件，儲存時才會清除這個標記。
  };

  const showStatus = (message, isError = false) => {
    const status = document.getElementById('status');
    if (!status) return;
    status.textContent = message;
    status.style.background = isError ? '#9f2d2d' : '#163f3b';
    status.classList.add('show');
    window.setTimeout(() => status.classList.remove('show'), 2800);
  };

  const normalizeDate = value => String(value || '').trim().replaceAll('/', '-');
  const createAuthUi = () => {
    const overlay = document.createElement('div');
    overlay.className = 'cloud-auth-overlay';
    overlay.innerHTML = `
      <section class="cloud-auth-card" role="dialog" aria-modal="true" aria-labelledby="cloudAuthTitle">
        <div class="cloud-auth-brand">禮儀案件管理</div>
        <h1 id="cloudAuthTitle">登入雲端系統</h1>
        <p>登入後可在不同電腦與手機查看同一公司的案件。</p>
        <form id="cloudAuthForm" class="cloud-auth-form cloud-auth-form-active">
          <label>公司名稱
            <input name="company_name" autocomplete="organization" placeholder="第一次註冊時填寫">
          </label>
          <label>公司開通序號
            <input name="trial_code" autocomplete="one-time-code" placeholder="新公司註冊時必填">
          </label>
          <label>員工邀請碼
            <input name="invite_code" autocomplete="one-time-code" placeholder="員工註冊時才需要填寫">
          </label>
          <label>電子信箱
            <input name="email" type="email" autocomplete="email" required>
          </label>
          <label>密碼
            <input name="password" type="password" autocomplete="current-password" minlength="8" required>
          </label>
          <div class="cloud-auth-options">
            <label class="cloud-auth-remember">
              <input name="remember_me" type="checkbox">
              <span>記住我 30 天</span>
            </label>
            <button class="cloud-auth-link" type="button" data-auth-action="forgot-password">忘記密碼？</button>
          </div>
          <div class="cloud-auth-error" aria-live="polite"></div>
          <button class="cloud-auth-primary" type="submit">登入</button>
          <button class="cloud-auth-secondary" type="button" data-auth-action="signup">建立帳號</button>
        </form>
        <form id="cloudRecoveryForm" class="cloud-auth-form" hidden>
          <label>註冊電子信箱
            <input name="recovery_email" type="email" autocomplete="email" required>
          </label>
          <div class="cloud-auth-error" aria-live="polite"></div>
          <button class="cloud-auth-primary" type="submit">寄送重設郵件</button>
          <button class="cloud-auth-secondary" type="button" data-auth-action="back-login">返回登入</button>
        </form>
        <form id="cloudPasswordUpdateForm" class="cloud-auth-form" hidden>
          <label>新密碼
            <input name="new_password" type="password" autocomplete="new-password" minlength="8" required>
          </label>
          <label>再次輸入新密碼
            <input name="confirm_password" type="password" autocomplete="new-password" minlength="8" required>
          </label>
          <div class="cloud-auth-error" aria-live="polite"></div>
          <button class="cloud-auth-primary" type="submit">更新密碼</button>
        </form>
      </section>
    `;
    document.body.append(overlay);

    const title = overlay.querySelector('#cloudAuthTitle');
    const introduction = overlay.querySelector('.cloud-auth-card > p');
    const form = overlay.querySelector('#cloudAuthForm');
    const recoveryForm = overlay.querySelector('#cloudRecoveryForm');
    const passwordUpdateForm = overlay.querySelector('#cloudPasswordUpdateForm');
    const errorBox = form.querySelector('.cloud-auth-error');
    const recoveryMessage = recoveryForm.querySelector('.cloud-auth-error');
    const passwordUpdateMessage = passwordUpdateForm.querySelector('.cloud-auth-error');
    const loginButton = form.querySelector('.cloud-auth-primary');
    const signupButton = form.querySelector('[data-auth-action="signup"]');
    const forgotPasswordButton = form.querySelector('[data-auth-action="forgot-password"]');
    const recoveryButton = recoveryForm.querySelector('.cloud-auth-primary');
    const passwordUpdateButton = passwordUpdateForm.querySelector('.cloud-auth-primary');
    const authForms = [
      { mode: 'login', element: form },
      { mode: 'recovery', element: recoveryForm },
      { mode: 'password-update', element: passwordUpdateForm }
    ];
    let recoveryCooldownTimer = 0;

    const credentials = () => ({
      companyName: form.elements.company_name.value.trim(),
      trialCode: form.elements.trial_code.value.trim(),
      inviteCode: form.elements.invite_code.value.trim(),
      email: form.elements.email.value.trim(),
      password: form.elements.password.value,
      rememberMe: form.elements.remember_me.checked
    });
    const setMessage = (element, text, isSuccess = false) => {
      element.textContent = text;
      element.classList.toggle('success', isSuccess);
    };
    const showMode = (mode, message = '', isSuccess = false) => {
      authForms.forEach(({ mode: formMode, element }) => {
        const isActive = formMode === mode;
        element.hidden = !isActive;
        element.classList.toggle('cloud-auth-form-active', isActive);
        element.setAttribute('aria-hidden', String(!isActive));
      });
      setMessage(errorBox, '', false);
      setMessage(recoveryMessage, '', false);
      setMessage(passwordUpdateMessage, '', false);
      if (mode === 'recovery') {
        title.textContent = '忘記密碼';
        introduction.textContent = '輸入註冊信箱，我們會寄送一次性的密碼重設連結。';
        recoveryForm.elements.recovery_email.value = form.elements.email.value.trim();
        setMessage(recoveryMessage, message, isSuccess);
      } else if (mode === 'password-update') {
        title.textContent = '設定新密碼';
        introduction.textContent = '驗證已完成，請輸入至少 8 個字元的新密碼。';
        passwordUpdateForm.reset();
        setMessage(passwordUpdateMessage, message, isSuccess);
      } else {
        title.textContent = '登入雲端系統';
        introduction.textContent = '登入後可在不同電腦與手機查看同一公司的案件。';
        setMessage(errorBox, message, isSuccess);
      }
      overlay.classList.remove('cloud-auth-hidden');
    };
    const setBusy = busy => {
      loginButton.disabled = busy;
      signupButton.disabled = busy;
      forgotPasswordButton.disabled = busy;
      loginButton.textContent = busy ? '處理中…' : '登入';
    };

    form.addEventListener('submit', async event => {
      event.preventDefault();
      errorBox.textContent = '';
      const { email, password, rememberMe } = credentials();
      setRememberSession(rememberMe);
      setBusy(true);
      const { error } = await cloud.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) {
        setRememberSession(false);
        errorBox.textContent = `登入失敗：${error.message}`;
      }
    });

    signupButton.addEventListener('click', async () => {
      errorBox.textContent = '';
      const { companyName, trialCode, inviteCode, email, password, rememberMe } = credentials();
      if (!inviteCode && (!companyName || !trialCode)) {
        errorBox.textContent = '新公司註冊請填公司名稱與開通序號；員工註冊請填邀請碼。';
        return;
      }
      if (!email || password.length < 8) {
        errorBox.textContent = '請填寫電子信箱，密碼至少需要 8 個字元。';
        return;
      }
      setRememberSession(rememberMe);
      setBusy(true);
      const { data, error } = await cloud.auth.signUp({
        email,
        password,
        options: {
          data: {
            company_name: companyName,
            trial_code: trialCode,
            invite_code: inviteCode
          }
        }
      });
      setBusy(false);
      if (error) {
        setRememberSession(false);
        errorBox.textContent = `註冊失敗：${error.message}`;
      } else if (!data.session) {
        setRememberSession(false);
        errorBox.textContent = '帳號已建立，請先到信箱完成驗證，再回來登入。';
      }
    });

    forgotPasswordButton.addEventListener('click', () => showMode('recovery'));
    recoveryForm.querySelector('[data-auth-action="back-login"]').addEventListener('click', () => {
      showMode('login');
    });
    recoveryForm.addEventListener('submit', async event => {
      event.preventDefault();
      const email = recoveryForm.elements.recovery_email.value.trim();
      if (!email) {
        setMessage(recoveryMessage, '請輸入註冊電子信箱。');
        return;
      }
      setMessage(recoveryMessage, '');
      recoveryButton.disabled = true;
      recoveryButton.textContent = '寄送中…';
      const { error } = await cloud.auth.resetPasswordForEmail(email, {
        redirectTo: passwordResetRedirectUrl
      });
      if (error) {
        const isRateLimited = /rate limit|too many/i.test(error.message || '');
        setMessage(
          recoveryMessage,
          isRateLimited ? '寄送次數過多，請稍後再試。' : '目前無法寄送重設郵件，請稍後再試。'
        );
        recoveryButton.disabled = false;
        recoveryButton.textContent = '寄送重設郵件';
        return;
      }
      setMessage(
        recoveryMessage,
        '若此信箱已註冊，將會收到密碼重設郵件。請檢查收件匣與垃圾郵件。',
        true
      );
      let remainingSeconds = 60;
      window.clearInterval(recoveryCooldownTimer);
      recoveryButton.textContent = `請稍候（${remainingSeconds}）`;
      recoveryCooldownTimer = window.setInterval(() => {
        remainingSeconds -= 1;
        recoveryButton.textContent = remainingSeconds > 0
          ? `請稍候（${remainingSeconds}）`
          : '重新寄送';
        if (remainingSeconds <= 0) {
          window.clearInterval(recoveryCooldownTimer);
          recoveryButton.disabled = false;
        }
      }, 1000);
    });
    passwordUpdateForm.addEventListener('submit', async event => {
      event.preventDefault();
      const password = passwordUpdateForm.elements.new_password.value;
      const confirmation = passwordUpdateForm.elements.confirm_password.value;
      if (password.length < 8) {
        setMessage(passwordUpdateMessage, '新密碼至少需要 8 個字元。');
        return;
      }
      if (password !== confirmation) {
        setMessage(passwordUpdateMessage, '兩次輸入的密碼不一致。');
        return;
      }
      setMessage(passwordUpdateMessage, '');
      passwordUpdateButton.disabled = true;
      passwordUpdateButton.textContent = '更新中…';
      const { error } = await cloud.auth.updateUser({ password });
      if (error) {
        setMessage(passwordUpdateMessage, `密碼更新失敗：${error.message}`);
        passwordUpdateButton.disabled = false;
        passwordUpdateButton.textContent = '更新密碼';
        return;
      }
      passwordRecoveryActive = false;
      window.history.replaceState({}, document.title, window.location.pathname);
      await cloud.auth.signOut();
      showMode('login', '密碼已更新，請使用新密碼登入。', true);
      passwordUpdateButton.disabled = false;
      passwordUpdateButton.textContent = '更新密碼';
    });
    if (passwordRecoveryActive) showMode('password-update');
    return {
      overlay,
      showLogin: (message = '', isSuccess = false) => showMode('login', message, isSuccess),
      showPasswordUpdate: (message = '') => showMode('password-update', message)
    };
  };

  const authUi = createAuthUi();
  const authOverlay = authUi.overlay;

  const createAccountUi = () => {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar || document.querySelector('.cloud-account')) return;
    const panel = document.createElement('div');
    panel.className = 'cloud-account';
    panel.innerHTML = `
      <span class="cloud-dot"></span>
      <span class="cloud-account-email"></span>
      <span class="cloud-account-role"></span>
      <button type="button">登出</button>
    `;
    panel.querySelector('button').addEventListener('click', () => cloud.auth.signOut());
    sidebar.append(panel);
  };

  const companyForUser = async () => {
    const { data, error } = await cloud
      .from('company_members')
      .select('company_id, role, read_only')
      .eq('user_id', activeUser.id)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data?.company_id) {
      throw new Error('找不到公司資料。若帳號在資料表建立前就已存在，請建立新的登入帳號。');
    }
    return data;
  };

  const rowFromRecord = record => ({
    company_id: activeCompanyId,
    case_no: String(record?.fields?.case_no || '').trim(),
    case_name: String(record?.fields?.case_name || '').trim() || '未命名案件',
    death_date: normalizeDate(record?.fields?.death_date) || null,
    funeral_date: normalizeDate(record?.fields?.funeral_date) || null,
    payload: record
  });

  const upsertRecords = async records => {
    if (activeReadOnly) throw new Error('此帳號僅可瀏覽，不能新增或修改案件。');
    const rows = records
      .filter(record => String(record?.fields?.case_no || '').trim())
      .map(rowFromRecord);
    if (!rows.length) return;
    const { error } = await cloud
      .from('cases')
      .upsert(rows, { onConflict: 'company_id,case_no' });
    if (error) throw error;
    rows.forEach(row => clearDeletedCase(row.case_no));
  };

  const loadAndMergeCloud = async () => {
    if (!activeCompanyId || syncing) return;
    syncing = true;
    try {
      if (activeReadOnly) {
        const { data: readOnlyRows, error: readOnlyError } = await cloud
          .from('cases')
          .select('case_no, payload, updated_at')
          .eq('company_id', activeCompanyId)
          .order('updated_at', { ascending: false });
        if (readOnlyError) throw readOnlyError;
        writeLocalRecords((readOnlyRows || []).map(row => row.payload).filter(Boolean));
        showStatus('唯讀案件已從雲端載入');
        return;
      }
      const deleted = readDeletedCaseNumbers();
      await Promise.all([...deleted].map(async caseNo => {
        try { await deleteCloudCase(caseNo); }
        catch (error) { console.warn('案件雲端刪除將於下次同步重試', caseNo, error); }
      }));
      const { data: cloudRows, error } = await cloud
        .from('cases')
        .select('case_no, payload, updated_at')
        .eq('company_id', activeCompanyId)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      writeLocalRecords(
        (cloudRows || [])
          .filter(row => !deleted.has(String(row.case_no)))
          .map(row => row.payload)
          .filter(Boolean)
      );
      showStatus('雲端資料同步完成');
    } catch (error) {
      console.error('Supabase 同步失敗', error);
      const cachedRecords = readLocalRecords();
      if (cachedRecords.length) writeDisplayRecords(cachedRecords);
      showStatus(`雲端同步失敗：${error.message}`, true);
    } finally {
      syncing = false;
    }
  };

  const syncLatestLocalRecord = async () => {
    if (!activeCompanyId || activeReadOnly) return;
    const records = readDisplayRecords();
    writeCompanyLocalRecords(records);
    const draft = (() => {
      try { return JSON.parse(localStorage.getItem('funeral-case-draft-v1') || 'null'); }
      catch { return null; }
    })();
    const number = String(draft?.fields?.case_no || '').trim();
    const record = records.find(item =>
      String(item?.fields?.case_no || '').trim() === number
    );
    if (!record) return;
    try {
      await upsertRecords([record]);
      showStatus(`案件 ${number} 已同步到雲端`);
    } catch (error) {
      console.error('案件雲端儲存失敗', error);
      showStatus(`本機已儲存，雲端同步失敗：${error.message}`, true);
    }
  };

  let latestRecordSyncTimer = 0;
  const queueLatestLocalRecordSync = () => {
    window.clearTimeout(latestRecordSyncTimer);
    latestRecordSyncTimer = window.setTimeout(syncLatestLocalRecord, 80);
  };

  const roleLabels = {
    owner: '老闆',
    admin: '管理員',
    staff: '員工'
  };

  const escapeHtml = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const showCloudManagementView = (button, view, render) => {
    window.__closeAllAppViews();
    document.querySelector('.top')?.style.setProperty('display', 'none');
    view.classList.add('active');
    document.querySelectorAll('.sidebar .nav > button')
      .forEach(item => item.classList.toggle('active', item === button));
    render();
  };

  const createLineManagementUi = () => {
    if (!['owner', 'admin'].includes(activeRole)) return;
    const nav = document.querySelector('.sidebar .nav');
    const main = document.querySelector('.main');
    if (!nav || !main) return;

    let button = nav.querySelector('[data-cloud-line-management]');
    let view = main.querySelector('.cloud-line-management');
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.dataset.cloudLineManagement = 'true';
      button.textContent = 'LINE　自動下單';
      nav.append(button);
    }
    if (!view) {
      view = document.createElement('section');
      view.className = 'cloud-line-management';
      view.innerHTML = `
        <header class="cloud-staff-header">
          <div>
            <h1>LINE 官方帳號自動下單</h1>
            <p>先將官方帳號加入指定群組，再用一次性綁定碼連接公司。</p>
          </div>
          <button type="button" class="btn" data-line-refresh>重新整理</button>
        </header>
        <section class="cloud-staff-panel cloud-line-guide">
          <h2>群組綁定</h2>
          <ol>
            <li>確認 LINE 官方帳號已開啟「允許加入群組」，並把官方帳號加入要接單的群組。</li>
            <li>按「產生綁定碼」，再於 30 分鐘內到該 LINE 群組輸入顯示的完整指令。</li>
            <li>官方帳號回覆「綁定成功」後，回來按重新整理。</li>
          </ol>
          <button type="button" class="btn primary" data-line-create-code>產生綁定碼</button>
          <div class="cloud-line-code" hidden>
            <span>請在 LINE 群組輸入：</span>
            <strong></strong>
            <button type="button" class="btn" data-line-copy-code>複製指令</button>
          </div>
        </section>
        <div class="cloud-staff-message cloud-line-message" aria-live="polite"></div>
        <section class="cloud-staff-panel">
          <h2>已綁定群組</h2>
          <div class="cloud-line-group-list"></div>
        </section>
        <section class="cloud-staff-panel">
          <div class="cloud-line-log-heading">
            <h2>最近傳送記錄</h2>
            <div class="cloud-line-log-actions">
              <label><input type="checkbox" data-line-log-select-all> 全選</label>
              <button type="button" class="btn cloud-member-remove" data-line-log-delete disabled>刪除勾選記錄</button>
            </div>
          </div>
          <div class="cloud-line-log-list"></div>
        </section>
      `;
      main.append(view);
    }

    if (!document.getElementById('cloud-line-management-style')) {
      const style = document.createElement('style');
      style.id = 'cloud-line-management-style';
      style.textContent = `
        .cloud-line-management{display:none}
        .cloud-line-management.active{display:block}
        .cloud-line-guide ol{margin:8px 0 18px;padding-left:24px;line-height:1.8;color:#475569}
        .cloud-line-code{margin-top:16px;padding:16px;border-radius:10px;background:#e8f5f1;align-items:center;gap:12px;flex-wrap:wrap}
        .cloud-line-code:not([hidden]){display:flex}
        .cloud-line-code strong{font-size:22px;letter-spacing:.08em;color:#115d54}
        .cloud-line-group-row,.cloud-line-log-row{display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:12px;padding:13px 0;border-top:1px solid var(--line)}
        .cloud-line-group-row:first-child,.cloud-line-log-row:first-child{border-top:0}
        .cloud-line-group-row span,.cloud-line-log-row span{display:block;color:var(--muted);font-size:13px;margin-top:3px}
        .cloud-line-log-heading{display:flex;align-items:center;justify-content:space-between;gap:12px}
        .cloud-line-log-heading h2{margin:0}
        .cloud-line-log-actions{display:flex;align-items:center;gap:10px}
        .cloud-line-log-actions label{display:flex;align-items:center;gap:6px;white-space:nowrap}
        .cloud-line-log-actions input,.cloud-line-log-select{width:18px;height:18px;margin:0;accent-color:#147d70}
        .cloud-line-log-row{grid-template-columns:auto minmax(0,1fr) auto}
        .cloud-line-status-sent{color:#197a6e;font-weight:800}
        .cloud-line-status-failed{color:#b91c1c;font-weight:800}
        @media(max-width:560px){
          .cloud-line-log-heading{align-items:flex-start;flex-direction:column}
          .cloud-line-log-actions{width:100%;justify-content:space-between}
          .cloud-line-group-row{grid-template-columns:1fr}
          .cloud-line-log-row{grid-template-columns:auto minmax(0,1fr);align-items:start}
          .cloud-line-log-row> b{grid-column:2}
          .cloud-line-group-row .btn{width:100%}
        }
      `;
      document.head.append(style);
    }

    const message = view.querySelector('.cloud-line-message');
    const groupList = view.querySelector('.cloud-line-group-list');
    const logList = view.querySelector('.cloud-line-log-list');
    const codeBox = view.querySelector('.cloud-line-code');
    const codeText = codeBox.querySelector('strong');
    const logSelectAll = view.querySelector('[data-line-log-select-all]');
    const deleteLogButton = view.querySelector('[data-line-log-delete]');
    const setMessage = (text, isError = false) => {
      message.textContent = text;
      message.classList.toggle('error', isError);
    };
    const syncLogSelectionUi = () => {
      const checkboxes = [...logList.querySelectorAll('[data-line-log-select]')];
      const selectedCount = checkboxes.filter(checkbox => checkbox.checked).length;
      logSelectAll.checked = checkboxes.length > 0 && selectedCount === checkboxes.length;
      logSelectAll.indeterminate = selectedCount > 0 && selectedCount < checkboxes.length;
      logSelectAll.disabled = checkboxes.length === 0;
      deleteLogButton.disabled = selectedCount === 0;
      deleteLogButton.textContent = selectedCount
        ? `刪除勾選記錄（${selectedCount}）`
        : '刪除勾選記錄';
    };

    const renderLineManagement = async () => {
      setMessage('載入中…');
      const [{ data: groups, error: groupError }, { data: logs, error: logError }] =
        await Promise.all([
          cloud
            .from('line_groups')
            .select('id, group_name, active, bound_at')
            .eq('company_id', activeCompanyId)
            .order('bound_at', { ascending: false }),
          cloud
            .from('line_order_logs')
            .select('id, case_no, case_name, status, error_message, sent_at')
            .eq('company_id', activeCompanyId)
            .order('sent_at', { ascending: false })
            .limit(20)
        ]);
      if (groupError || logError) {
        setMessage(`讀取失敗：${groupError?.message || logError?.message}`, true);
        return;
      }
      groupList.innerHTML = (groups || []).length ? '' : '<p class="cloud-staff-empty">尚未綁定任何 LINE 群組。</p>';
      (groups || []).forEach(group => {
        const row = document.createElement('div');
        row.className = 'cloud-line-group-row';
        row.innerHTML = `
          <div><strong>${escapeHtml(group.group_name || 'LINE 群組')}</strong>
            <span>${group.active ? '自動下單會傳送到此群組' : '已暫停傳送'}</span></div>
          <button type="button" class="btn ${group.active ? '' : 'primary'}"
            data-line-group-active="${escapeHtml(group.id)}"
            data-next-active="${group.active ? 'false' : 'true'}">${group.active ? '暫停' : '啟用'}</button>
          <button type="button" class="btn cloud-member-remove"
            data-line-group-remove="${escapeHtml(group.id)}">解除綁定</button>
        `;
        groupList.append(row);
      });
      logList.innerHTML = (logs || []).length ? '' : '<p class="cloud-staff-empty">尚無傳送紀錄。</p>';
      (logs || []).forEach(log => {
        const row = document.createElement('div');
        row.className = 'cloud-line-log-row';
        const sentAt = new Date(log.sent_at).toLocaleString('zh-TW');
        row.innerHTML = `
          <input type="checkbox" class="cloud-line-log-select"
            data-line-log-select="${escapeHtml(log.id)}"
            aria-label="選取案件 ${escapeHtml(log.case_no || '')} 的傳送記錄">
          <div><strong>${escapeHtml(log.case_no || '')}　${escapeHtml(log.case_name || '未命名案件')}</strong>
            <span>${escapeHtml(sentAt)}${log.error_message ? ` · ${escapeHtml(log.error_message)}` : ''}</span></div>
          <b class="${log.status === 'sent' ? 'cloud-line-status-sent' : 'cloud-line-status-failed'}">
            ${log.status === 'sent' ? '已送出' : '失敗'}
          </b>
        `;
        logList.append(row);
      });
      syncLogSelectionUi();
      setMessage('');
    };

    if (!view.dataset.bound) {
      view.dataset.bound = 'true';
      view.addEventListener('change', event => {
        if (event.target.matches('[data-line-log-select-all]')) {
          logList.querySelectorAll('[data-line-log-select]').forEach(checkbox => {
            checkbox.checked = event.target.checked;
          });
          syncLogSelectionUi();
          return;
        }
        if (event.target.matches('[data-line-log-select]')) syncLogSelectionUi();
      });
      view.addEventListener('click', async event => {
        const target = event.target.closest('button');
        if (!target) return;
        if (target.matches('[data-line-refresh]')) {
          await renderLineManagement();
          return;
        }
        if (target.matches('[data-line-create-code]')) {
          const code = Array.from(crypto.getRandomValues(new Uint8Array(6)))
            .map(number => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[number % 32])
            .join('');
          const { error } = await cloud.from('line_bind_codes').insert({
            company_id: activeCompanyId,
            code,
            created_by: activeUser.id
          });
          if (error) {
            setMessage(`綁定碼建立失敗：${error.message}`, true);
            return;
          }
          codeText.textContent = `綁定 ${code}`;
          codeBox.hidden = false;
          setMessage('綁定碼有效時間為 30 分鐘。');
          return;
        }
        if (target.matches('[data-line-copy-code]')) {
          await navigator.clipboard.writeText(codeText.textContent);
          setMessage('LINE 綁定指令已複製。');
          return;
        }
        if (target.matches('[data-line-log-delete]')) {
          const selectedIds = [...logList.querySelectorAll('[data-line-log-select]:checked')]
            .map(checkbox => checkbox.dataset.lineLogSelect)
            .filter(Boolean);
          if (!selectedIds.length) return;
          if (!window.confirm(`確定刪除勾選的 ${selectedIds.length} 筆傳送記錄？刪除後無法復原。`)) return;
          target.disabled = true;
          setMessage('正在刪除傳送記錄…');
          const { error } = await cloud
            .from('line_order_logs')
            .delete()
            .eq('company_id', activeCompanyId)
            .in('id', selectedIds);
          if (error) {
            setMessage(`刪除失敗：${error.message}`, true);
            syncLogSelectionUi();
          } else {
            await renderLineManagement();
            setMessage(`已刪除 ${selectedIds.length} 筆傳送記錄。`);
          }
          return;
        }
        if (target.dataset.lineGroupActive) {
          const { error } = await cloud
            .from('line_groups')
            .update({ active: target.dataset.nextActive === 'true', updated_at: new Date().toISOString() })
            .eq('company_id', activeCompanyId)
            .eq('id', target.dataset.lineGroupActive);
          if (error) setMessage(`更新失敗：${error.message}`, true);
          else await renderLineManagement();
          return;
        }
        if (target.dataset.lineGroupRemove) {
          if (!window.confirm('確定解除這個 LINE 群組的綁定？')) return;
          const { error } = await cloud
            .from('line_groups')
            .delete()
            .eq('company_id', activeCompanyId)
            .eq('id', target.dataset.lineGroupRemove);
          if (error) setMessage(`解除失敗：${error.message}`, true);
          else await renderLineManagement();
        }
      });
      button.addEventListener('click', () => {
        showCloudManagementView(button, view, renderLineManagement);
      });
    }
  };

  const createStaffManagementUi = () => {
    if (!['owner', 'admin'].includes(activeRole)) return;
    const nav = document.querySelector('.sidebar .nav');
    const main = document.querySelector('.main');
    if (!nav || !main) return;

    let button = nav.querySelector('[data-cloud-staff-management]');
    let view = main.querySelector('.cloud-staff-management');
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.dataset.cloudStaffManagement = 'true';
      button.textContent = '♙　員工管理';
      nav.append(button);
    }
    if (!view) {
      view = document.createElement('section');
      view.className = 'cloud-staff-management';
      view.innerHTML = `
        <header class="cloud-staff-header">
          <div>
            <h1>員工帳號與權限</h1>
            <p>建立邀請碼後，員工使用指定 Email、邀請碼及自訂密碼註冊。</p>
          </div>
          <button type="button" class="btn" data-staff-refresh>重新整理</button>
        </header>
        <form class="cloud-staff-invite-form">
          <label>員工姓名
            <input name="display_name" required placeholder="例如：王小明">
          </label>
          <label>員工 Email
            <input name="email" type="email" required placeholder="name@example.com">
          </label>
          <label>角色
            <select name="role">
              <option value="staff">員工</option>
              <option value="admin">管理員</option>
            </select>
          </label>
          <label class="cloud-read-only-option">
            <input name="read_only" type="checkbox">
            <span>僅可瀏覽</span>
            <small>不可新增、修改、刪除或自動下單</small>
          </label>
          <button class="btn primary" type="submit">建立邀請碼</button>
        </form>
        <div class="cloud-staff-message" aria-live="polite"></div>
        <section class="cloud-staff-panel">
          <h2>現有成員</h2>
          <div class="cloud-member-list"></div>
        </section>
        <section class="cloud-staff-panel">
          <h2>尚未使用的邀請碼</h2>
          <div class="cloud-invite-list"></div>
        </section>
      `;
      main.append(view);
    }

    const message = view.querySelector('.cloud-staff-message');
    const memberList = view.querySelector('.cloud-member-list');
    const inviteList = view.querySelector('.cloud-invite-list');
    const inviteForm = view.querySelector('.cloud-staff-invite-form');

    const setMessage = (text, isError = false) => {
      message.textContent = text;
      message.classList.toggle('error', isError);
    };

    const renderStaffManagement = async () => {
      setMessage('載入中…');
      const [{ data: members, error: memberError }, { data: invites, error: inviteError }] =
        await Promise.all([
          cloud
            .from('company_members')
            .select('user_id, email, display_name, role, read_only, active, created_at')
            .eq('company_id', activeCompanyId)
            .order('created_at', { ascending: true }),
          cloud
            .from('company_invites')
            .select('id, email, display_name, role, read_only, expires_at, accepted_at')
            .eq('company_id', activeCompanyId)
            .is('accepted_at', null)
            .order('created_at', { ascending: false })
        ]);

      if (memberError || inviteError) {
        setMessage(
          `讀取失敗：${memberError?.message || inviteError?.message || '未知錯誤'}`,
          true
        );
        return;
      }

      memberList.innerHTML = '';
      (members || []).forEach(member => {
        const row = document.createElement('div');
        row.className = 'cloud-member-row';
        const isSelf = member.user_id === activeUser.id;
        const canEdit = !isSelf && member.role !== 'owner';
        const canSetReadOnly = canEdit && member.role === 'staff';
        row.innerHTML = `
          <div class="cloud-member-identity">
            <strong>${escapeHtml(member.display_name || member.email || '未命名')}</strong>
            <span>${escapeHtml(member.email || '')}</span>
          </div>
          <select data-member-role="${escapeHtml(member.user_id)}"
            ${canEdit ? '' : 'disabled'}>
            <option value="owner" ${member.role === 'owner' ? 'selected' : ''}>老闆</option>
            <option value="admin" ${member.role === 'admin' ? 'selected' : ''}>管理員</option>
            <option value="staff" ${member.role === 'staff' ? 'selected' : ''}>員工</option>
          </select>
          <label class="cloud-member-read-only">
            <input type="checkbox"
              data-member-read-only="${escapeHtml(member.user_id)}"
              ${member.read_only ? 'checked' : ''}
              ${canSetReadOnly ? '' : 'disabled'}>
            <span>僅可瀏覽</span>
          </label>
          <button type="button" class="btn ${member.active ? '' : 'primary'}"
            data-member-active="${escapeHtml(member.user_id)}"
            data-next-active="${member.active ? 'false' : 'true'}"
            ${canEdit ? '' : 'disabled'}>
            ${member.active ? '停用' : '啟用'}
          </button>
          <button type="button" class="btn cloud-member-remove"
            data-member-remove="${escapeHtml(member.user_id)}"
            ${canEdit ? '' : 'disabled'}>移除</button>
        `;
        memberList.append(row);
      });

      inviteList.innerHTML = '';
      if (!(invites || []).length) {
        inviteList.innerHTML = '<p class="cloud-staff-empty">目前沒有待使用的邀請碼。</p>';
      }
      (invites || []).forEach(invite => {
        const row = document.createElement('div');
        row.className = 'cloud-invite-row';
        row.innerHTML = `
          <div>
            <strong>${escapeHtml(invite.display_name || invite.email)}</strong>
            <span>${escapeHtml(invite.email)} · ${roleLabels[invite.role] || invite.role}${invite.read_only ? ' · 僅可瀏覽' : ''}</span>
          </div>
          <code>${escapeHtml(invite.id)}</code>
          <button type="button" class="btn" data-invite-copy="${escapeHtml(invite.id)}">複製</button>
          <button type="button" class="btn cloud-member-remove"
            data-invite-remove="${escapeHtml(invite.id)}">取消</button>
        `;
        inviteList.append(row);
      });
      setMessage('');
    };

    if (!view.dataset.bound) {
      view.dataset.bound = 'true';
      const inviteRole = inviteForm.elements.role;
      const inviteReadOnly = inviteForm.elements.read_only;
      const syncInviteReadOnly = () => {
        const isStaff = inviteRole.value === 'staff';
        inviteReadOnly.disabled = !isStaff;
        if (!isStaff) inviteReadOnly.checked = false;
      };
      inviteRole.addEventListener('change', syncInviteReadOnly);
      syncInviteReadOnly();

      inviteForm.addEventListener('submit', async event => {
        event.preventDefault();
        const values = new FormData(inviteForm);
        const email = String(values.get('email') || '').trim().toLowerCase();
        const displayName = String(values.get('display_name') || '').trim();
        const role = String(values.get('role') || 'staff');
        const readOnly = role === 'staff' && values.get('read_only') === 'on';
        setMessage('正在建立邀請碼…');
        const { data, error } = await cloud
          .from('company_invites')
          .insert({
            company_id: activeCompanyId,
            email,
            display_name: displayName,
            role,
            read_only: readOnly,
            created_by: activeUser.id
          })
          .select('id')
          .single();
        if (error) {
          setMessage(`建立失敗：${error.message}`, true);
          return;
        }
        inviteForm.reset();
        syncInviteReadOnly();
        setMessage(`邀請碼已建立：${data.id}`);
        await renderStaffManagement();
      });

      view.addEventListener('change', async event => {
        const readOnly = event.target.closest('[data-member-read-only]');
        if (readOnly) {
          const { error } = await cloud
            .from('company_members')
            .update({ read_only: readOnly.checked })
            .eq('company_id', activeCompanyId)
            .eq('user_id', readOnly.dataset.memberReadOnly);
          if (error) {
            readOnly.checked = !readOnly.checked;
            setMessage(`瀏覽權限更新失敗：${error.message}`, true);
          } else {
            setMessage(readOnly.checked ? '此員工已設為僅可瀏覽。' : '此員工已恢復編輯權限。');
          }
          return;
        }
        const select = event.target.closest('[data-member-role]');
        if (!select) return;
        const { error } = await cloud
          .from('company_members')
          .update({ role: select.value })
          .eq('company_id', activeCompanyId)
          .eq('user_id', select.dataset.memberRole);
        if (error) setMessage(`權限更新失敗：${error.message}`, true);
        else {
          setMessage('員工權限已更新。');
          await renderStaffManagement();
        }
      });

      view.addEventListener('click', async event => {
        const target = event.target.closest('button');
        if (!target) return;
        if (target.matches('[data-staff-refresh]')) {
          await renderStaffManagement();
          return;
        }
        if (target.dataset.inviteCopy) {
          await navigator.clipboard.writeText(target.dataset.inviteCopy);
          setMessage('邀請碼已複製。');
          return;
        }
        if (target.dataset.memberActive) {
          const { error } = await cloud
            .from('company_members')
            .update({ active: target.dataset.nextActive === 'true' })
            .eq('company_id', activeCompanyId)
            .eq('user_id', target.dataset.memberActive);
          if (error) setMessage(`更新失敗：${error.message}`, true);
          else await renderStaffManagement();
          return;
        }
        if (target.dataset.memberRemove) {
          if (!window.confirm('確定移除此員工帳號？')) return;
          const { error } = await cloud
            .from('company_members')
            .delete()
            .eq('company_id', activeCompanyId)
            .eq('user_id', target.dataset.memberRemove);
          if (error) setMessage(`移除失敗：${error.message}`, true);
          else await renderStaffManagement();
          return;
        }
        if (target.dataset.inviteRemove) {
          const { error } = await cloud
            .from('company_invites')
            .delete()
            .eq('company_id', activeCompanyId)
            .eq('id', target.dataset.inviteRemove);
          if (error) setMessage(`取消失敗：${error.message}`, true);
          else await renderStaffManagement();
        }
      });

      button.addEventListener('click', () => {
        showCloudManagementView(button, view, renderStaffManagement);
      });
    }
  };

  const readOnlyControlSelector = [
    '#newCaseButton',
    '#saveTop',
    '#reset',
    '#sample',
    '#customSortToggle',
    '#caseForm input:not([readonly])',
    '#caseForm select',
    '#caseForm textarea',
    '#caseForm button[type="submit"]',
    '#caseForm [data-add]',
    '#caseForm .add',
    '#caseForm .remove',
    '#caseForm .vendor-line-order',
    '#lineAutoOrder',
    '#lineOrderGroup',
    '#addDateSelection',
    '#date-selection-sheet input:not([readonly])',
    '#date-selection-sheet select',
    '#date-selection-sheet .remove'
  ].join(',');

  const applyReadOnlyUi = () => {
    document.body.dataset.cloudReadOnly = activeReadOnly ? 'true' : 'false';
    if (!activeReadOnly) {
      document.querySelectorAll('[data-cloud-read-only-disabled="true"]').forEach(control => {
        control.disabled = false;
        delete control.dataset.cloudReadOnlyDisabled;
      });
      document.querySelector('.cloud-read-only-banner')?.remove();
      return;
    }

    document.querySelectorAll(readOnlyControlSelector).forEach(control => {
      if (!(control instanceof HTMLButtonElement
        || control instanceof HTMLInputElement
        || control instanceof HTMLSelectElement
        || control instanceof HTMLTextAreaElement)) return;
      if (!control.disabled) {
        control.dataset.cloudReadOnlyDisabled = 'true';
        control.disabled = true;
      }
    });

    if (!document.querySelector('.cloud-read-only-banner')) {
      const banner = document.createElement('div');
      banner.className = 'cloud-read-only-banner';
      banner.textContent = '目前帳號僅可瀏覽；不能新增、修改、刪除案件或自動下單。';
      const main = document.querySelector('.main');
      const top = main?.querySelector('.top');
      if (main) main.insertBefore(banner, top || main.firstChild);
    }
  };

  const applyRoleUi = () => {
    document.body.dataset.cloudRole = activeRole;
    const role = document.querySelector('.cloud-account-role');
    if (role) role.textContent = roleLabels[activeRole] || activeRole;
    if (activeRole === 'staff') {
      document.querySelectorAll('.case-list-view .delete-case').forEach(button => {
        button.hidden = true;
      });
    } else {
      createStaffManagementUi();
      createLineManagementUi();
    }
    applyReadOnlyUi();
  };

  document.addEventListener('click', event => {
    if (activeReadOnly) {
      const mutationControl = event.target instanceof Element
        ? event.target.closest(readOnlyControlSelector)
        : null;
      if (mutationControl) {
        event.preventDefault();
        event.stopImmediatePropagation();
        showStatus('此帳號僅可瀏覽，不能修改資料。', true);
        return;
      }
    }
    if (activeRole !== 'staff') return;
    const deleteButton = event.target instanceof Element
      ? event.target.closest('.case-list-view .delete-case')
      : null;
    if (!deleteButton) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    showStatus('員工帳號沒有刪除案件的權限。', true);
  }, true);

  const caseListObserver = new MutationObserver(() => {
    if (activeRole === 'staff') {
      document.querySelectorAll('.case-list-view .delete-case').forEach(button => {
        button.hidden = true;
      });
    }
    if (activeReadOnly) applyReadOnlyUi();
  });
  caseListObserver.observe(document.body, { childList: true, subtree: true });

  const initializeSession = async session => {
    activeUser = session?.user || null;
    if (!activeUser) {
      writeDisplayRecords([]);
      activeCompanyId = '';
      activeRole = '';
      activeReadOnly = false;
      applyReadOnlyUi();
      authOverlay.classList.remove('cloud-auth-hidden');
      document.querySelector('.cloud-account')?.remove();
      document.querySelector('[data-cloud-staff-management]')?.remove();
      document.querySelector('.cloud-staff-management')?.remove();
      document.querySelector('[data-cloud-line-management]')?.remove();
      document.querySelector('.cloud-line-management')?.remove();
      return;
    }

    authOverlay.classList.add('cloud-auth-hidden');
    createAccountUi();
    const email = document.querySelector('.cloud-account-email');
    if (email) email.textContent = activeUser.email || '已登入';
    try {
      const membership = await companyForUser();
      activeCompanyId = membership.company_id;
      activeRole = membership.role;
      activeReadOnly = membership.role === 'staff' && membership.read_only === true;
      backupUnscopedRecords();
      writeDisplayRecords(readLocalRecords());
      applyRoleUi();
      window.dispatchEvent(new CustomEvent('funeral-cloud-ready', {
        detail: { companyId: activeCompanyId, role: activeRole, readOnly: activeReadOnly }
      }));
      await loadAndMergeCloud();
    } catch (error) {
      showStatus(`雲端初始化失敗：${error.message}`, true);
    }
  };

  document.addEventListener('submit', event => {
    if (event.target?.id !== 'caseForm') return;
    if (activeReadOnly) {
      event.preventDefault();
      event.stopImmediatePropagation();
      showStatus('此帳號僅可瀏覽，不能儲存案件。', true);
      return;
    }
    queueLatestLocalRecordSync();
  }, true);

  document.addEventListener('funeral:case-saved', () => {
    if (!activeCompanyId || activeReadOnly) return;
    queueLatestLocalRecordSync();
  });

  document.addEventListener('funeral:case-deleted', async event => {
    const caseNo = String(event.detail?.caseNo || '').trim();
    if (!caseNo || !activeCompanyId) return;
    try {
      await deleteCloudCase(caseNo);
      showStatus(`案件 ${caseNo} 已從雲端刪除`);
    } catch (error) {
      showStatus(`本機已刪除，雲端刪除將於重新整理時重試：${error.message}`, true);
    }
  });

  document.addEventListener('click', event => {
    const button = event.target instanceof Element
      ? event.target.closest('.case-list-view .delete-case')
      : null;
    if (!button || !activeCompanyId) return;
    const row = button.closest('.case-list-row');
    const rows = [...document.querySelectorAll('.case-list-view .case-list-row')];
    const records = [...readLocalRecords()].sort((a, b) =>
      String(b?.fields?.case_no || '').localeCompare(String(a?.fields?.case_no || ''))
    );
    const caseNo = String(row?.dataset?.caseNo || records[rows.indexOf(row)]?.fields?.case_no || '').trim();
    if (!caseNo) return;
    window.setTimeout(async () => {
      const stillExists = readLocalRecords().some(record =>
        String(record?.fields?.case_no || '').trim() === caseNo
      );
      if (stillExists) return;
      const { error } = await cloud
        .from('cases')
        .delete()
        .eq('company_id', activeCompanyId)
        .eq('case_no', caseNo);
      if (error) showStatus(`本機已刪除，雲端刪除失敗：${error.message}`, true);
      else showStatus(`案件 ${caseNo} 已從雲端刪除`);
    }, 120);
  }, true);

  cloud.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      passwordRecoveryActive = true;
      window.setTimeout(() => authUi.showPasswordUpdate(), 0);
      return;
    }
    if (passwordRecoveryActive) return;
    window.setTimeout(() => initializeSession(session), 0);
  });
  cloud.auth.getSession().then(({ data }) => {
    if (passwordRecoveryActive) {
      authUi.showPasswordUpdate();
      return;
    }
    initializeSession(data.session);
  });
  window.funeralCloud = {
    client: cloud,
    sync: loadAndMergeCloud,
    deleteCase: deleteCloudCase,
    sendLineOrder: async payload => {
      const { data, error } = await cloud.functions.invoke('line-order', { body: payload });
      if (error) {
        let message = error.message || 'LINE 傳送失敗';
        try {
          const detail = await error.context?.json();
          if (detail?.error) message = detail.error;
        } catch {
          // 保留原始錯誤訊息。
        }
        throw new Error(message);
      }
      if (data?.error) throw new Error(data.error);
      return data;
    },
    get companyId() { return activeCompanyId; },
    get role() { return activeRole; },
    get readOnly() { return activeReadOnly; }
  };
})();
