(() => {
    const checkboxChoiceNames = [
      'nailing', 'maternal', 'farewell_rite', 'coffin_rite', 'coffin_tap',
      'mourning_dress', 'band', 'hearse', 'body_care', 'outside_board', 'shroud'
    ];
    checkboxChoiceNames.forEach(name => {
      document.querySelectorAll(`input[type="radio"][name="${name}"]`).forEach(input => {
        input.type = 'checkbox';
      });
    });
  })();

;

const K='funeral-case-draft-v1'; const $=s=>document.querySelector(s); const form=$('#caseForm');
let hasUnsavedCaseChanges = false;
function markCaseDirty() {
  hasUnsavedCaseChanges = true;
  setCaseStatus('輸入中');
}
function clearCaseDirty() {
  hasUnsavedCaseChanges = false;
}
function markCaseSaved() {
  clearCaseDirty();
  setCaseStatus('已儲存');
}
function confirmDiscardUnsavedCase() {
  if (!hasUnsavedCaseChanges) return true;
  const shouldLeave = window.confirm('此案件尚未儲存，確定要離開嗎？');
  if (shouldLeave) clearCaseDirty();
  return shouldLeave;
}
window.__hasUnsavedCaseChanges = () => hasUnsavedCaseChanges;
window.__markCaseDirty = markCaseDirty;
window.__markCaseSaved = markCaseSaved;
window.__confirmDiscardUnsavedCase = confirmDiscardUnsavedCase;

window.addEventListener('beforeunload', event => {
  if (!hasUnsavedCaseChanges) return;
  event.preventDefault();
  event.returnValue = '';
});

document.addEventListener('click', event => {
  if (!hasUnsavedCaseChanges) return;
  const formSection = document.querySelector('.section');
  if (!formSection || window.getComputedStyle(formSection).display === 'none') return;
  const target = event.target instanceof Element ? event.target : null;
  const navigationTarget = target?.closest([
    '.sidebar .nav > button',
    '.case-archive-navigation button',
    '.case-list-view .case-list-row button:not(.delete-case):not(.export-case):not(.export-word-case)',
    '.case-search-results [data-search-index]',
    '.case-archive-row .case-archive-actions button:not(.delete-case):not(.export-case):not(.export-word-case)'
  ].join(','));
  if (!navigationTarget || confirmDiscardUnsavedCase()) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);
const vendorItems=['接體','冰箱','靈堂','棚架','花山','椅套','擇日','棺木','骨罐','協助驗屍','洗穿化殮','壽衣','司儀','禮生','樂隊','扶棺人員','靈車','供品','素菜','交通車','紙紮','庫錢','投影設備'];
function input(n,type='text',value=''){return `<input type="${type}" ${n?`name="${n}"`:''} value="${value}">`}
function remove(){return '<button type="button" class="btn remove" style="padding:6px 9px">刪除</button>'}
function lunarText(value){if(!value)return '';try{let normalized=String(value).trim().replaceAll('/','-').split(/[ T]/)[0],roc=normalized.match(/^(\d{3})-(\d{2})-(\d{2})$/);if(roc)normalized=`${Number(roc[1])+1911}-${roc[2]}-${roc[3]}`;let d=new Date(normalized+'T12:00:00');if(Number.isNaN(d.getTime()))return '';let p=new Intl.DateTimeFormat('zh-TW-u-ca-chinese',{year:'numeric',month:'long',day:'numeric'}).formatToParts(d),v=t=>p.find(x=>x.type===t)?.value||'',y=Number(v('relatedYear')||v('year')),m=v('month'),monthMap={正:1,一:1,二:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9,十:10,十一:11,冬:11,十二:12,臘:12},month=monthMap[String(m).replace('閏','').replace('月','')],day=Number(String(v('day')).replace(/\D/g,'')),leap=String(m).includes('閏')?'閏':'';if(!Number.isFinite(y)||!month||!day)return '';let stems=['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'],branches=['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'],sexagenaryYear=d.getFullYear()-(d.getMonth()===1&&d.getDate()<4?1:0);return `${stems[(sexagenaryYear-4)%10]}${branches[(sexagenaryYear-4)%12]}年農${leap}${month}/${day}`}catch{return '農曆轉換暫時無法使用'}}
function syncLunarDates(root=document){root.querySelectorAll('input[type="date"]').forEach(date=>{let note=date.nextElementSibling;if(!note||!note.classList.contains('lunar-note')){note=document.createElement('p');note.className='lunar-note';date.insertAdjacentElement('afterend',note);date.addEventListener('change',()=>syncLunarDates(date.parentElement))}note.textContent=lunarText(date.value);note.classList.toggle('show',!!date.value)})}
function configure24HourTimeInput(timeInput, onValueChange = () => {}) {
  if (!timeInput) return;
  timeInput.type = 'text';
  timeInput.inputMode = 'numeric';
  timeInput.maxLength = 5;
  timeInput.placeholder = 'HHMM';
  timeInput.title = '請輸入 24 小時制時間，例如 1300 或 13:00';
  const refresh = () => {
    const compact = String(timeInput.value || '').trim().replace(':', '');
    const valid = !compact || /^(?:[01]\d|2[0-3])[0-5]\d$/.test(compact);
    timeInput.setCustomValidity(valid ? '' : '請輸入四位數 24 小時制時間，例如 1300 或 13:00');
    onValueChange(timeInput.value);
  };
  timeInput.addEventListener('input', refresh);
  timeInput.addEventListener('change', refresh);
  timeInput.addEventListener('blur', () => {
    const compact = String(timeInput.value || '').trim().replace(':', '');
    if (/^(?:[01]\d|2[0-3])[0-5]\d$/.test(compact)) {
      timeInput.value = `${compact.slice(0, 2)}:${compact.slice(2)}`;
    }
    refresh();
  });
  refresh();
}
function refreshBasicTimeBranches(root = document) {
  root.querySelectorAll('[name="birth_time_branch"], [name="death_time_branch"]')
    .forEach(input => input.dispatchEvent(new Event('input', { bubbles: true })));
}
function getScheduleLocationShortcutValue() {
  const selected = document.querySelector('[name="schedule_location_source"]:checked')?.value;
  if (selected === 'home') return document.querySelector('[name="address"]')?.value || '';
  if (selected === 'altar') return document.querySelector('[name="altar_location"]')?.value || '';
  return '';
}
function refreshAutoGrowingTextarea(textarea) {
  if (!textarea) return;
  textarea.style.height = '0px';
  textarea.style.height = `${Math.max(48, textarea.scrollHeight)}px`;
}
function configureAutoGrowingTextarea(textarea) {
  if (!textarea) return;
  textarea.addEventListener('input', () => refreshAutoGrowingTextarea(textarea));
  textarea.addEventListener('keydown', event => {
    if (!(event.altKey && event.key === 'Enter')) return;
    event.preventDefault();
    textarea.setRangeText('\n', textarea.selectionStart, textarea.selectionEnd, 'end');
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  });
  requestAnimationFrame(() => refreshAutoGrowingTextarea(textarea));
}
function refreshScheduleRemarkHeights(root = document) {
  root.querySelectorAll?.('#schedules textarea[name="schedule_remark"]')
    .forEach(refreshAutoGrowingTextarea);
}
const scheduleTableForAutoGrow = document.getElementById('schedules');
if (scheduleTableForAutoGrow && 'ResizeObserver' in window) {
  let autoGrowResizeQueued = false;
  new ResizeObserver(() => {
    if (autoGrowResizeQueued) return;
    autoGrowResizeQueued = true;
    requestAnimationFrame(() => {
      autoGrowResizeQueued = false;
      refreshScheduleRemarkHeights();
    });
  }).observe(scheduleTableForAutoGrow);
}
document.addEventListener('click', event => {
  if (!event.target.closest('[data-tab="ceremony"]')) return;
  requestAnimationFrame(() => refreshScheduleRemarkHeights());
});
function addRow(table, values = {}) {
  const tableBody = document.querySelector(`#${table} tbody`);
  if (!tableBody) return;
  const tr = document.createElement('tr');
  if (table === 'contacts') {
    tr.innerHTML = `<td>${input('contact_name','text',values.name||'')}</td><td>${input('contact_relation','text',values.relation||'')}</td><td>${input('contact_phone','tel',values.phone||'')}</td><td>${remove()}</td>`;
  }
  if (table === 'schedules') {
    document.getElementById('schedules')?.tHead?.remove();
    const scheduleHeader = document.createElement('tr');
    scheduleHeader.className = 'schedule-entry-header';
    scheduleHeader.innerHTML = '<th>項目</th><th>日期</th><th>時間</th><th>人數</th><th>地點</th><th></th>';
    const scheduleNoteValue = values.note ?? getScheduleLocationShortcutValue();
    tr.className = 'schedule-main-row';
    const scheduleTimeMatch = String(values.time || '').trim().match(/^([01]?\d|2[0-3]):?([0-5]\d)$/);
    const scheduleTimeValue = scheduleTimeMatch
      ? `${scheduleTimeMatch[1].padStart(2, '0')}:${scheduleTimeMatch[2]}`
      : '';
    tr.innerHTML = `<td class="schedule-item-cell">${input('schedule_item','text',values.item||'')}<div class="schedule-row-notes"><label>備註</label><textarea name="schedule_remark" rows="1"></textarea></div></td><td>${input('schedule_date','text',values.date||'')}</td><td><input name="schedule_time" value="${scheduleTimeValue}" aria-label="功德法事時間"></td><td><input name="schedule_people" type="number" min="0" step="1" inputmode="numeric" placeholder="0" aria-label="功德法事人數" value="${values.people||''}"></td><td>${input('schedule_note','text',scheduleNoteValue)}</td><td>${remove()}</td>`;
    const scheduleRemark = tr.querySelector('[name="schedule_remark"]');
    scheduleRemark.value = values.remark || '';
    configureAutoGrowingTextarea(scheduleRemark);
    const remarkRow = document.createElement('tr');
    remarkRow.className = 'schedule-remark-row';
    remarkRow.innerHTML = '<td colspan="6"><label>備註</label></td>';
    remarkRow.querySelector('td').append(scheduleRemark);
    tr.querySelector('.schedule-row-notes')?.remove();
    tr._scheduleHeaderRow = scheduleHeader;
    tr._scheduleRemarkRow = remarkRow;
    configure24HourTimeInput(tr.querySelector('[name="schedule_time"]'));
    const schedulePeople = tr.querySelector('[name="schedule_people"]');
    schedulePeople.addEventListener('keydown', event => {
      if (['e', 'E', '+', '-', '.'].includes(event.key)) event.preventDefault();
    });
    schedulePeople.addEventListener('input', () => {
      if (schedulePeople.value === '') return;
      const people = Number(schedulePeople.value);
      schedulePeople.value = Number.isFinite(people)
        ? String(Math.max(0, Math.trunc(people)))
        : '';
    });
  }
  if (table === 'vendorsTable') {
    // 新增廠商列必須保持空白；預設項目只由 fillDefaults 初次建立時明確帶入。
    const vendorItem = String(values.item || '');
    tr.innerHTML = `
      <td><input name="vendor_item" type="text" value="${vendorItem}" aria-label="廠商項目"></td>
      <td>${input('vendor_name','text',values.vendor||'')}</td>
      <td>${input('vendor_note','text',values.note||'')}</td>
      <td><input type="checkbox" name="vendor_notified" ${values.notified?'checked':''}></td>
      <td><input type="checkbox" name="vendor_confirmed" ${values.confirmed?'checked':''}></td>
      <td class="vendor-line-cell"><select class="vendor-line-group" aria-label="選擇 LINE 群組"><option value="">載入群組中…</option></select><button type="button" class="vendor-line-order">自動下單</button></td>
      <td>${remove()}</td>
    `;
    tr.dataset.vendorLineGroup = values.lineGroupId || '';
    tr.dataset.vendorLineOrdered = values.lineOrdered ? 'true' : 'false';
  }
  if (table === 'ritualsTable') {
    tr.innerHTML = `<td>${input('ritual_item','text',values.item||'')}</td><td>${input('ritual_vendor','text',values.vendor||'')}</td><td>${input('ritual_people','number',values.people||'')}</td><td>${input('ritual_note','text',values.note||'')}</td><td>${remove()}</td>`;
  }
  if (table === 'schedules') tableBody.append(tr._scheduleHeaderRow);
  tableBody.append(tr);
  if (table === 'schedules') tableBody.append(tr._scheduleRemarkRow);
  syncLunarDates(tr);
  window.refreshContentSizedFields?.(tr);
  tr.querySelector('.remove').onclick = () => {
    tr._scheduleHeaderRow?.remove();
    tr.remove();
    tr._scheduleRemarkRow?.remove();
    save();
    updateMetrics();
  };
}
function fillDefaults({ seedVendors = true } = {}){
  if (!$('#contacts tbody')?.rows.length) addRow('contacts');
  if (!$('#schedules tbody')?.rows.length) addRow('schedules');
  if (!seedVendors) return;
  const existingVendorItems = new Set(
    [...document.querySelectorAll('#vendorsTable [name="vendor_item"]')]
      .map(input => String(input.value || '').trim())
      .filter(Boolean)
  );
  vendorItems.forEach(item => {
    if (!existingVendorItems.has(item)) addRow('vendorsTable', { item });
  });
  if (!$('#ritualsTable tbody')?.rows.length) addRow('ritualsTable');
}
function scheduleRemarkControl(row) {
  const remarkRow = row?._scheduleRemarkRow
    || (row?.nextElementSibling?.classList.contains('schedule-remark-row')
      ? row.nextElementSibling
      : null);
  return remarkRow?.querySelector('[name="schedule_remark"]') || null;
}
function rows(table,fields){
  const body=$('#'+table+' tbody');
  if(!body)return [];
  if(table==='schedules')return [...body.querySelectorAll('tr.schedule-main-row')].map(r=>({
    item:r.querySelector('[name="schedule_item"]')?.value||'',
    date:r.querySelector('[name="schedule_date"]')?.value||'',
    time:r.querySelector('[name="schedule_time"]')?.value||'',
    people:r.querySelector('[name="schedule_people"]')?.value||'',
    note:r.querySelector('[name="schedule_note"]')?.value||'',
    remark:scheduleRemarkControl(r)?.value||''
  }));
  return [...body.rows].map(r=>Object.fromEntries(fields.map((f,i)=>{
    const control=r.cells[i]?.querySelector('input,select,textarea');
    return [f,control?.type==='checkbox'?control.checked:control?.value||''];
  })));
}
function applyStoredChoiceValue(targetForm, name, value) {
  const controls = [...targetForm.elements].filter(control => control.name === name);
  const choiceControls = controls.filter(control =>
    control.type === 'checkbox' || control.type === 'radio'
  );
  if (!choiceControls.length) return false;

  const selectedValues = Array.isArray(value)
    ? value
    : value == null || value === ''
      ? []
      : [value];
  const isChoiceGroup = choiceControls.length > 1 || choiceControls[0].type === 'radio';

  choiceControls.forEach(control => {
    control.checked = isChoiceGroup
      ? selectedValues.includes(control.value)
      : Array.isArray(value)
        ? selectedValues.includes(control.value)
        : Boolean(value);
  });
  return true;
}
function collect() {
  const vendors = [...($('#vendorsTable tbody')?.rows || [])].map(row => ({
    item: row.querySelector('[name="vendor_item"]')?.value || '',
    vendor: row.querySelector('[name="vendor_name"]')?.value || '',
    note: row.querySelector('[name="vendor_note"]')?.value || '',
    notified: Boolean(row.querySelector('[name="vendor_notified"]')?.checked),
    confirmed: Boolean(row.querySelector('[name="vendor_confirmed"]')?.checked),
    lineGroupId: row.querySelector('.vendor-line-group')?.value || row.dataset.vendorLineGroup || '',
    lineOrdered: row.dataset.vendorLineOrdered === 'true'
  }));
  const data = {
    fields: {},
    contacts: rows('contacts', ['name','relation','phone']),
    schedules: rows('schedules', ['item','date','time','people','note']),
    vendors,
    rituals: rows('ritualsTable', ['item','vendor','people','note'])
  };
  [...form.elements].forEach(e => {
    if (!e.name || e.closest('tbody')) return;
    if (e.type === 'radio') {
      if (e.checked) data.fields[e.name] = e.value;
    } else if (e.type === 'checkbox') {
      const controls = form.elements[e.name];
      if (controls instanceof RadioNodeList) {
        if (Object.prototype.hasOwnProperty.call(data.fields, e.name)) return;
        data.fields[e.name] = [...controls].filter(input => input.checked).map(input => input.value);
      } else {
        data.fields[e.name] = e.checked;
      }
    } else {
      data.fields[e.name] = e.value;
    }
  });
  return data;
}
function load(data) {
  HTMLFormElement.prototype.reset.call(form);
  ['contacts', 'schedules', 'vendorsTable', 'ritualsTable']
    .forEach(table => $(`#${table} tbody`).innerHTML = '');
  Object.entries(data.fields || {}).forEach(([name, storedValue]) => {
    if (applyStoredChoiceValue(form, name, storedValue)) return;
    const control = form.elements[name];
    if (!control) return;
    const value = Array.isArray(storedValue) ? storedValue.join(',') : storedValue;
    if (control.type === 'date' && value && !/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
      setTimeout(() => {
        const current = form.elements[name];
        if (!current) return;
        current.value = value;
        current.dispatchEvent(new Event('input', { bubbles: true }));
      }, 0);
    } else {
      control.value = value;
    }
  });
  (data.contacts || []).forEach(values => addRow('contacts', values));
  (data.schedules || []).forEach(values => addRow('schedules', values));
  (data.vendors || []).forEach(values => addRow('vendorsTable', values));
  (data.rituals || []).forEach(values => addRow('ritualsTable', values));
  fillDefaults({ seedVendors: false });
  refreshAutoGrowingTextarea(form.elements.notes);
  syncLunarDates();
  window.refreshContentSizedFields?.();
  setTimeout(() => {
    markCaseSaved();
    window.__refreshVenueLunarLabels?.();
  }, 0);
  updateMetrics();
}
function flash(t='已儲存案件草稿'){let s=$('#status');s.textContent=t;s.classList.add('show');setTimeout(()=>s.classList.remove('show'),2400)}
function setCaseStatus(status){const element=$('#caseStatus');if(element) element.textContent=status}
function syncEditCaseTitle(){const title=document.querySelector('.top h1');if(!title)return;const name=String(form.elements.case_name?.value||'').trim();if(window.__editingCaseNo||title.textContent.trim().startsWith('編輯案件'))title.textContent=name?`編輯案件｜${name}`:'編輯案件'}
function save(){let d=collect();localStorage.setItem(K,JSON.stringify(d));markCaseSaved();flash()}
function updateMetrics(){
  let required=[...form.querySelectorAll('[required]')],
      filled=required.filter(x=>x.value).length,
      extra=[...form.querySelectorAll('input,select,textarea')].filter(x=>x.value||x.checked).length,
      total=[...form.querySelectorAll('input,select,textarea')].filter(x=>x.type!=='button'&&x.type!=='submit').length;
  const completion=$('#completion');
  const vendorCount=$('#vendorCount');
  const ritualCount=$('#ritualCount');
  const ritualTable=$('#schedules tbody');
  const caseNameField=form.elements.case_name;
  const caseNameLabel=caseNameField?.closest('.field')?.querySelector(':scope > label');
  if(caseNameLabel) caseNameLabel.innerHTML='<span>案名</span> <span class="required">*</span>';
  if(completion) completion.textContent=Math.min(100,Math.round(((filled+extra)/(required.length+total))*100));
  if(vendorCount) vendorCount.textContent=[...form.querySelectorAll('[name=vendor_confirmed]')].filter(x=>!x.checked).length;
  if(ritualCount) ritualCount.textContent=ritualTable?[...ritualTable.querySelectorAll('tr.schedule-main-row')].filter(row=>[...row.querySelectorAll('input,select,textarea')].some(control=>control.type==='checkbox'||control.type==='radio'?control.checked:String(control.value||'').trim()!=='')).length:0;
  syncEditCaseTitle();
}
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tabs button,.pane').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('#'+b.dataset.tab).classList.add('active')});
document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{addRow(b.dataset.add);updateMetrics()});
form.addEventListener('input',()=>{markCaseDirty();updateMetrics()});
form.addEventListener('change',()=>{markCaseDirty();syncLunarDates();updateMetrics()});
form.addEventListener('click',event=>{const target=event.target instanceof Element?event.target:null;if(target?.closest('[data-add],.add,.remove'))markCaseDirty()},true);
form.addEventListener('submit',e=>{e.preventDefault();if(form.reportValidity())save()});
$('#saveTop').onclick=()=>{if(form.reportValidity())save()};
$('#reset').onclick=()=>{if(confirm('確定清除此案件的本機草稿？')){localStorage.removeItem(K);HTMLFormElement.prototype.reset.call(form);['contacts','schedules','vendorsTable','ritualsTable'].forEach(t=>$('#'+t+' tbody').innerHTML='');fillDefaults();syncLunarDates();clearCaseDirty();setCaseStatus('輸入中');updateMetrics();flash('已清除草稿')}};
$('#sample').onclick=()=>{load({fields:{case_name:'王○○府治喪案件',gender:'男',birth_date:'1948-04-12',death_date:'2026-07-20',funeral_date:'2026-07-27',inspection_unit:'桃園市立殯儀館',source:'親友介紹',religion:'佛教',pickup_location:'桃園區住家',altar_location:'桃園市立殯儀館',burial_type:'火化',tower_location:'桃園市○○納骨塔',mourning_dress:'傳統',band:'國樂',band_people:'5',hearse:'中式',body_care:'一般',shroud:'公司'},contacts:[{name:'王大明',relation:'長子',phone:'0912-345-678'}],schedules:[{item:'頭七法事',date:'2026-07-26',time:'09:00',people:'12',note:''}],vendors:vendorItems.map((item,i)=>({item,vendor:i===0?'○○禮儀':'',note:'',notified:i===0,confirmed:false})),rituals:[{item:'頭七法事',vendor:'○○法師',people:'12',note:''}]});markCaseDirty();flash('已載入示範資料')};
let existing=localStorage.getItem(K);if(existing)load(JSON.parse(existing));else{fillDefaults();clearCaseDirty();setCaseStatus('輸入中')};syncLunarDates();updateMetrics();

(() => {
  const scheduleBlock = document.querySelector('#schedules')?.closest('.block');
  const title = scheduleBlock?.querySelector('.fieldset-title');
  if (!scheduleBlock || !title) return;

  const locationHeading = scheduleBlock.querySelector('#schedules thead th:nth-child(5)');
  if (locationHeading) locationHeading.textContent = '地點';

  title.classList.add('schedule-heading');

  const shortcuts = document.createElement('div');
  shortcuts.className = 'choice-row schedule-location-shortcuts';
  shortcuts.setAttribute('aria-label', '功德法事地點快速帶入');
  shortcuts.innerHTML = '<label><input type="checkbox" name="schedule_location_source" value="home">自宅</label><label><input type="checkbox" name="schedule_location_source" value="altar">設靈地點</label>';
  title.append(shortcuts);

  shortcuts.addEventListener('change', event => {
    const selected = event.target.closest('input[name="schedule_location_source"]');
    if (!selected || !selected.checked) return;
    shortcuts.querySelectorAll('input[name="schedule_location_source"]').forEach(input => {
      if (input !== selected) input.checked = false;
    });
    const location = getScheduleLocationShortcutValue();
    document.querySelectorAll('#schedules [name="schedule_note"]').forEach(input => {
      input.value = location;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  });
})();

;

// 宗教儀式屬於案件的基本屬性，與案件編號同列呈現。
  (() => {
    const religionField = document.querySelector('input[name="religion"]')?.closest('.field');
    const caseNumberField = document.querySelector('input[name="case_no"]')?.closest('.field');
    const caseNameField = document.querySelector('input[name="case_name"]')?.closest('.field');
    if (religionField && caseNumberField && caseNameField) {
      caseNameField.classList.remove('wide');
      caseNumberField.after(religionField);
    }
  })();

;

// 依實務流程調整欄位位置、名稱與選項。
  (() => {
    const fieldFor = name => document.querySelector(`[name="${name}"]`)?.closest('.field');
    const rename = (name, text) => { const label = fieldFor(name)?.querySelector(':scope > label'); if (label) label.textContent = text; };
    const makeSelect = (name, options, placeholder = '請選擇') => {
      const old = document.querySelector(`[name="${name}"]`);
      if (!old || old.tagName === 'SELECT') return;
      const select = document.createElement('select');
      select.name = name;
      select.innerHTML = `<option value="">${placeholder}</option>` + options.map(option => `<option value="${option}">${option}</option>`).join('');
      if (old.value) {
        if (!options.includes(old.value)) select.insertAdjacentHTML('beforeend', `<option value="${old.value}">${old.value}</option>`);
        select.value = old.value;
      }
      old.replaceWith(select);
    };

    makeSelect('burial_type', ['火化', '土葬', '樹葬', '海葬', '植存', '其他']);
    makeSelect('tablet_handling', ['化香火袋隨罐', '化香火罐返主', '整坐牌位返主', '不留']);
    rename('burial_location', '安葬地點');
    rename('spirit_location', '返主安靈地點');
    rename('bath_towels', '外家浴巾');

    rename('towels', '\u6bdb\u5dfe\u6a23\u5f0f');
    rename('small_towels', '\u5c0f\u65b9\u5dfe\u6a23\u5f0f');
    const bathField = fieldFor('bath_towels');
    const giftField = fieldFor('maternal_gifts');
    if (bathField && giftField) giftField.after(bathField);

    const religionField = fieldFor('religion');
    const caseNumberField = fieldFor('case_no');
    const caseNameField = fieldFor('case_name');
    if (religionField && caseNumberField && caseNameField) {
      caseNameField.classList.remove('wide');
      caseNumberField.after(religionField);
    }
  })();

;

// 基本資料依實際填寫順序重排；小螢幕會依既有響應式規則自動直向顯示。
  (() => {
    const grid = document.querySelector('#basic .form-grid');
    const fieldFor = name => document.querySelector(`#basic [name="${name}"]`)?.closest('.field');
    const rename = (name, text) => { const label = fieldFor(name)?.querySelector(':scope > label'); if (label) label.textContent = text; };
    const caseName = fieldFor('case_name');
    const inspection = fieldFor('inspection_unit');
    if (caseName) caseName.classList.remove('wide');
    if (inspection) inspection.classList.remove('wide');
    rename('birth_date', '出生日期');
    rename('death_date', '過世日期');
    fieldFor('phone')?.remove();
    [
      'case_no', 'case_name', 'religion',
      'gender', 'funeral_date', 'inspection_unit',
      'source', 'ethnicity', 'birth_date',
      'death_date', 'address'
    ].forEach(name => { const field = fieldFor(name); if (field && grid) grid.append(field); });
  })();

;

(() => {
    const grid = document.querySelector('#basic .form-grid');
    const fieldFor = name => document.querySelector(`#basic [name="${name}"]`)?.closest('.field');
    const ethnicity = document.querySelector('#basic [name="ethnicity"]');
    if (ethnicity) ethnicity.placeholder = '例如：閩、客、外';

    const source = fieldFor('source');
    const birth = fieldFor('birth_date');
    const death = fieldFor('death_date');
    if (source) source.classList.add('wide');
    [birth, death].forEach(field => { if (field) field.style.gridColumn = 'span 6'; });
    ['source', 'ethnicity', 'birth_date', 'death_date', 'address'].forEach(name => {
      const field = fieldFor(name);
      if (field && grid) grid.append(field);
    });
  })();

;

(() => {
    const form = document.getElementById('caseForm');
    if (!form) return;

    const widthLimits = {
      case_no: [12, 20],
      case_name: [8, 32],
      case_type: [10, 26],
      religion: [10, 26],
      inspection_unit: [10, 26],
      source: [10, 26],
      ethnicity: [8, 18],
      tower_location: [10, 26],
      burial_location: [10, 26],
      contact_name: [8, 20],
      contact_relation: [6, 16],
      contact_phone: [12, 18]
    };
    const selectionLimits = [
      ['[data-case-summary="case_name"]', [8, 32]],
      ['input[name="selection_honorific"]', [6, 14]],
      ['input[name="selection_person_name"]', [6, 20]],
      ['input[name="selection_lunar_birth"]', [10, 18]],
      ['input[name="selection_solar_birth"]', [10, 14]]
    ];
    const selector = Object.keys(widthLimits)
      .map(name => `input[name="${name}"]`)
      .concat(selectionLimits.map(([fieldSelector]) => fieldSelector))
      .join(',');
    const textUnits = value => [...String(value || '')].reduce(
      (total, character) => total + (character.codePointAt(0) > 255 ? 2 : 1),
      0
    );

    window.resizeContentSizedInput = input => {
      if (!(input instanceof HTMLInputElement)) return;
      const limits = widthLimits[input.name]
        || selectionLimits.find(([fieldSelector]) => input.matches(fieldSelector))?.[1];
      if (!limits) return;
      const [minimum, maximum] = limits;
      const content = String(input.value || input.placeholder || '').trim();
      const width = Math.max(minimum, Math.min(maximum, textUnits(content) + 4));
      input.size = width;
      input.style.setProperty('--content-width', `${width}ch`);
    };

    window.refreshContentSizedFields = (root = form) => {
      if (!(root instanceof Element)) return;
      if (root.matches(selector)) window.resizeContentSizedInput(root);
      root.querySelectorAll(selector).forEach(window.resizeContentSizedInput);
    };

    form.addEventListener('input', event => window.resizeContentSizedInput(event.target));
    form.addEventListener('reset', () => requestAnimationFrame(() => window.refreshContentSizedFields(form)));
    const observer = new MutationObserver(() => window.refreshContentSizedFields(form));
    observer.observe(form, { childList: true, subtree: true });
    window.refreshContentSizedFields(form);
  })();

;

(() => {
    const basic = document.querySelector('#basic');
    basic?.querySelector(':scope > .section-title')?.remove();
    basic?.querySelector(':scope > .hint')?.remove();
  })();

;

(() => {
    const basic = document.querySelector('#basic');
    const basicGrid = basic?.querySelector(':scope > .form-grid');
    const arrangement = document.querySelector('#arrangement');
    const arrangementGrid = arrangement?.querySelector(':scope > .form-grid');
    const baseField = name => document.querySelector(`#basic [name="${name}"]`)?.closest('.field');

    // 交換基本資料欄位的填寫順序。
    ['case_no', 'case_name', 'gender', 'religion', 'inspection_unit', 'funeral_date', 'source', 'ethnicity', 'birth_date', 'death_date', 'address']
      .forEach(name => { const field = baseField(name); if (field && basicGrid) basicGrid.append(field); });

    // 將治喪、安葬與返主地點資料一併移入基本資料。
    const fieldsToMove = ['pickup_location', 'altar_location', 'burial_type', 'tower_location', 'burial_location', 'tablet_handling', 'spirit_location'];
    const moved = fieldsToMove.map(name => document.querySelector(`[name="${name}"]`)?.closest('.field')).filter(Boolean);
    if (moved.length && basic) {
      const group = document.createElement('div');
      group.className = 'block';
      group.innerHTML = '<div class="fieldset-title">治喪與安葬安排</div>';
      const groupGrid = document.createElement('div');
      groupGrid.className = 'form-grid';
      moved.forEach(field => { field.classList.remove('wide'); groupGrid.append(field); });
      group.append(groupGrid);
      const contactsBlock = basic.querySelector(':scope > .block');
      contactsBlock ? basic.insertBefore(group, contactsBlock) : basic.append(group);
      arrangementGrid?.remove();
      arrangement?.querySelector(':scope > .section-title')?.remove();
      arrangement?.querySelector(':scope > .hint')?.remove();
    }

    // 所有國曆欄位以同一方式在欄位名稱後顯示農曆。
    const setLunarInline = date => {
      const field = date.closest('.field');
      const label = field?.querySelector(':scope > label');
      if (label) {
        if (!label.dataset.baseLabel) label.dataset.baseLabel = label.textContent.trim();
        label.textContent = date.value ? `${label.dataset.baseLabel}（${lunarText(date.value)}）` : label.dataset.baseLabel;
      } else {
        let inline = date.nextElementSibling;
        if (!inline || !inline.classList.contains('lunar-inline')) {
          inline = document.createElement('span');
          inline.className = 'lunar-inline';
          date.insertAdjacentElement('afterend', inline);
        }
        inline.textContent = date.value ? lunarText(date.value) : '';
      }
    };
    const refreshLunar = () => document.querySelectorAll('#caseForm input[type="date"]').forEach(setLunarInline);
    document.querySelectorAll('#caseForm input[type="date"]').forEach(date => date.addEventListener('change', refreshLunar));
    refreshLunar();
  })();

;

// 動態新增的法事日期也套用同一個農曆呈現方式。
  (() => {
    const form = document.querySelector('#caseForm');
    if (!form) return;
    form.addEventListener('change', event => {
      if (event.target.matches('input[type="date"]')) {
        document.querySelectorAll('#caseForm input[type="date"]').forEach(date => {
          const field = date.closest('.field');
          const label = field?.querySelector(':scope > label');
          if (!label) {
            let inline = date.nextElementSibling;
            if (!inline || !inline.classList.contains('lunar-inline')) {
              inline = document.createElement('span');
              inline.className = 'lunar-inline';
              date.insertAdjacentElement('afterend', inline);
            }
            inline.textContent = date.value ? lunarText(date.value) : '';
            return;
          }
          if (!label.dataset.baseLabel) label.dataset.baseLabel = label.textContent.trim();
          label.textContent = date.value ? `${label.dataset.baseLabel}（${lunarText(date.value)}）` : label.dataset.baseLabel;
        });
      }
    });
  })();

;

(() => {
    // 民國年度 + 三位流水號，例如 115001。
    const caseNumber = document.querySelector('[name="case_no"]');
    const rocYear = new Date().getFullYear() - 1911;
    const counterKey = `funeral-case-counter-${rocYear}`;
    const nextNumber = () => `${rocYear}${String(Number(localStorage.getItem(counterKey) || '1')).padStart(3, '0')}`;
    if (caseNumber && !caseNumber.value) caseNumber.value = nextNumber();
    const originalSave = window.save;
    window.save = () => {
      if (caseNumber && !caseNumber.value) caseNumber.value = nextNumber();
      const result = originalSave();
      const savedNumber = caseNumber?.value || '';
      if (savedNumber.startsWith(String(rocYear))) {
        const current = Number(localStorage.getItem(counterKey) || '1');
        const used = Number(savedNumber.slice(String(rocYear).length));
        if (used >= current) localStorage.setItem(counterKey, String(used + 1));
      }
      return result;
    };

    document.querySelector('#sample')?.remove();
    document.querySelector('.top > div > p')?.remove();

    // 治喪與安葬欄位依作業順序重新排列，不再顯示額外小標。
    const arrangementGroup = document.querySelector('#basic .fieldset-title')?.parentElement;
    arrangementGroup?.querySelector('.fieldset-title')?.remove();
    const arrangementGrid = arrangementGroup?.querySelector('.form-grid');
    const field = name => document.querySelector(`#basic [name="${name}"]`)?.closest('.field');
    const setWidth = (name, width) => { const item = field(name); if (item) item.style.gridColumn = `span ${width}`; };
    setWidth('pickup_location', 6); setWidth('altar_location', 6);
    setWidth('tower_location', 6); setWidth('burial_type', 6);
    setWidth('burial_location', 12);
    setWidth('spirit_location', 6); setWidth('tablet_handling', 6);
    ['pickup_location', 'altar_location', 'tower_location', 'burial_type', 'burial_location', 'spirit_location', 'tablet_handling']
      .forEach(name => { const item = field(name); if (item && arrangementGrid) arrangementGrid.append(item); });
  })();

;

(() => {
    const form = document.querySelector('#caseForm');
    const mainNav = document.querySelector('.sidebar .nav');
    const navButtons = [...(mainNav?.querySelectorAll(':scope > button') || [])];
    const newButton = document.getElementById('newCaseButton');
    const listButton = navButtons.find(button =>
      (button.textContent || '').includes('案件列表')
    );
    const dashboard = document.querySelector('.dashboard');
    const formSection = document.querySelector('.section');
    const headerTitle = document.querySelector('.top h1');
    const listKey = 'funeral-case-records-v1';
    const listView = document.createElement('section');
    listView.className = 'case-list-view';
    listView.innerHTML = '<h2>案件列表</h2><div class="case-list-content"></div>';
    formSection?.before(listView);
    const closeAllAppViews = () => {
      dashboard.style.display = 'none';
      formSection.style.display = 'none';
      listView.style.display = 'none';
      [
        '.case-overview-view',
        '.case-archive-view',
        '.case-search-view',
        '.cloud-staff-management',
        '.cloud-line-management'
      ].forEach(selector => document.querySelector(selector)?.classList.remove('active'));
      mainNav?.querySelectorAll(':scope > button').forEach(button => button.classList.remove('active'));
      document.querySelectorAll('.case-archive-navigation button')
        .forEach(button => button.classList.remove('archive-active'));
      document.querySelector('.top')?.style.removeProperty('display');
      document.querySelector('.top .actions')?.style.removeProperty('display');
    };
    window.__closeAllAppViews = closeAllAppViews;
    const records = () => JSON.parse(localStorage.getItem(listKey) || '[]');
    const persist = items => localStorage.setItem(listKey, JSON.stringify(items));
    const setFormVisible = visible => {
      closeAllAppViews();
      dashboard.style.display = visible ? '' : 'none';
      formSection.style.display = visible ? '' : 'none';
      listView.style.display = visible ? 'none' : 'block';
      headerTitle.textContent = visible ? '新增案件' : '案件列表';
      newButton?.classList.toggle('active', visible);
      listButton?.classList.toggle('active', !visible);
    };
    const renderList = () => {
      const target = listView.querySelector('.case-list-content');
      const items = records().sort((a,b) => String(a.fields?.case_no || '').localeCompare(String(b.fields?.case_no || ''), 'zh-Hant', { numeric: true }));
      target.innerHTML = items.length ? '' : '<p class="empty-list">目前尚未儲存任何案件。</p>';
      items.forEach(item => {
        const row = document.createElement('div');
        row.className = 'case-list-row';
        const name = item.fields?.case_name || '未命名案件';
        const no = item.fields?.case_no || '';
        const date = item.fields?.funeral_date || '未填寫出殯日期';
        row.innerHTML = `<div><strong>${no}　${name}</strong><span>出殯日期：${date}</span></div><button type="button" class="btn">編輯</button>`;
        row.querySelector('button').onclick = () => { load(item); setFormVisible(true); window.scrollTo({top:0,behavior:'smooth'}); };
        target.append(row);
      });
    };
    newButton?.addEventListener('click', () => {
      setFormVisible(true);
      formSection.querySelector('.tabs button[data-tab="basic"]')?.click();
      window.__editingCaseNo = '';
      HTMLFormElement.prototype.reset.call(form);
      ['contacts','schedules','vendorsTable','ritualsTable','dateSelectionTable'].forEach(id => {
        const body = document.querySelector(`#${id} tbody`);
        if (body) body.replaceChildren();
      });
      fillDefaults();
      const caseNumber = form.elements.case_no;
      caseNumber.value = '';
      caseNumber.removeAttribute('readonly');
      caseNumber.required = true;
      caseNumber.placeholder = '請自行輸入案件編號';
      syncLunarDates();
      updateMetrics();
      clearCaseDirty();
      setCaseStatus('輸入中');
      window.scrollTo({top:0,behavior:'smooth'});
    });
    listButton?.addEventListener('click', () => { renderList(); setFormVisible(false); window.scrollTo({top:0,behavior:'smooth'}); });

    // 在既有儲存功能後，同步建立可閱讀的案件列表資料。
    const saveBeforeList = window.save;
    window.save = () => {
      const result = saveBeforeList();
      const item = collect();
      const items = records();
      const index = items.findIndex(record => record.fields?.case_no === item.fields?.case_no);
      if (index >= 0) items[index] = item; else items.push(item);
      persist(items);
      return result;
    };

    // 牌位處理與返主安靈地點互換位置。
    const groupGrid = document.querySelector('#basic .block .form-grid');
    const field = name => document.querySelector(`#basic [name="${name}"]`)?.closest('.field');
    ['pickup_location', 'altar_location', 'tower_location', 'burial_type', 'burial_location', 'tablet_handling', 'spirit_location']
      .forEach(name => { const item = field(name); if (item && groupGrid) groupGrid.append(item); });
  })();

;

(() => {
    // 禮儀用品依作業順序排列。
    const itemsGrid = document.querySelector('#arrangement .block .form-grid');
    const field = name => document.querySelector(`#arrangement [name="${name}"]`)?.closest('.field');
    const columnStarts = {
      condolence_money: 1,
      towels: 4,
      small_towels: 7,
      nailing: 1,
      maternal: 4,
      bath_towels: 7,
      maternal_gifts: 10,
    };
    Object.entries(columnStarts).forEach(([name, start]) => {
      const item = field(name);
      if (item) item.style.gridColumn = `${start} / span 3`;
    });
    ['condolence_money', 'towels', 'small_towels', 'nailing', 'maternal', 'bath_towels', 'maternal_gifts', 'coffin_style', 'urn_style', 'date_selection', 'obituary_style', 'extra_printing']
      .forEach(name => { const item = field(name); if (item && itemsGrid) itemsGrid.append(item); });
  })();

;

(() => {
    const old = document.querySelector('#arrangement [name="date_selection"]');
    if (old && old.tagName !== 'SELECT') {
      const select = document.createElement('select');
      select.name = 'date_selection';
      select.innerHTML = '<option value="">請選擇</option><option>火化與晉塔</option><option>僅火化</option><option>僅晉塔</option>';
      if (old.value) {
        if (![...select.options].some(option => option.value === old.value)) select.insertAdjacentHTML('beforeend', `<option>${old.value}</option>`);
        select.value = old.value;
      }
      old.replaceWith(select);
    }
  })();

;

(() => {
    // 修正棺木／骨罐欄位標示。
    const setLabel = (name, text) => {
      const label = document.querySelector(`[name="${name}"]`)?.closest('.field')?.querySelector(':scope > label');
      if (label) label.textContent = text;
    };
    setLabel('coffin_style', '骨罐樣式');
    setLabel('urn_style', '棺木樣式');

    // 將禮儀執行安排移至禮儀安排分頁最下方。
    const arrangement = document.querySelector('#arrangement');
    const ceremony = document.querySelector('#ceremony');
    const fields = ['mourning_dress', 'band', 'band_people', 'hearse', 'double_towel', 'food_note']
      .map(name => document.querySelector(`#ceremony [name="${name}"]`)?.closest('.field'))
      .filter(Boolean);
    if (arrangement && fields.length) {
      const block = document.createElement('div');
      block.className = 'block';
      const grid = document.createElement('div');
      grid.className = 'form-grid';
      fields.forEach(field => grid.append(field));
      block.append(grid);
      arrangement.append(block);
    }
    // 移除已空的原安排網格，保留功德法事供品與排程。
    const firstCeremonyGrid = ceremony?.querySelector(':scope > .form-grid');
    if (firstCeremonyGrid && !firstCeremonyGrid.children.length) firstCeremonyGrid.remove();
  })();

;

(() => {
    const arrangement = document.querySelector('#arrangement');
    const venue = document.querySelector('#venue');
    if (!arrangement || !venue) return;

    const fieldFor = (root, name) => root.querySelector(`[name="${name}"]`)?.closest('.field');

    // 樂隊人數併入樂隊的選項框，避免成為獨立欄位。
    const bandField = fieldFor(arrangement, 'band');
    const peopleField = fieldFor(arrangement, 'band_people');
    if (bandField && peopleField) {
      bandField.classList.add('band-choice');
      const peopleInput = peopleField.querySelector('[name="band_people"]');
      if (peopleInput && !bandField.querySelector('.people-inline')) {
        const inline = document.createElement('span');
        inline.className = 'people-inline';
        const label = document.createElement('span');
        label.textContent = '人數';
        inline.append(label, peopleInput);
        bandField.querySelector('.choice-row')?.append(inline);
      }
      peopleField.remove();
    }

    // 會場中的執行項目改放到禮儀安排最下方；百日、對年等後續追蹤仍留在會場分頁。
    const names = [
      'body_care', 'shroud', 'outside_board', 'canopy', 'ceremony_location',
      'decoration_style', 'photo_style', 'ceremony_offerings', 'maosha', 'large_lamp',
      'staff_male', 'staff_eldest_grandson', 'small_lamps', 'tour_bus', 'tower_car',
      'coffin_items', 'procession'
    ];
    const fields = names.map(name => fieldFor(venue, name)).filter(Boolean);
    if (fields.length) {
      const block = document.createElement('div');
      block.className = 'block venue-choice';
      const grid = document.createElement('div');
      grid.className = 'form-grid';
      fields.forEach(field => grid.append(field));
      block.append(grid);
      arrangement.append(block);
    }
  })();

;

(() => {
    const ceremony = document.querySelector('#ceremony');
    const venue = document.querySelector('#venue');
    const tab = document.querySelector('.tabs button[data-tab="ceremony"]');
    if (tab) tab.textContent = '功德法事';

    // 功德法事頁不再顯示重複的大標題。
    ceremony?.querySelector(':scope > .section-title')?.remove();

    // 紙紮庫錢歸入功德法事。
    const paperField = venue?.querySelector('[name="paper_offerings"]')?.closest('.field');
    if (ceremony && paperField) {
      let grid = ceremony.querySelector(':scope > .form-grid');
      if (!grid) {
        grid = document.createElement('div');
        grid.className = 'form-grid';
        ceremony.insertBefore(grid, ceremony.firstChild);
      }
      grid.prepend(paperField);
    }

    const offeringLabel = ceremony?.querySelector('[name="offering_meat"]')?.closest('.field')?.querySelector(':scope > label');
    offeringLabel?.classList.add('offering-label');
  })();

;

(() => {
    const replaceAncestorTablet = () => {
      const old = document.querySelector('#venue [name="ancestor_tablet"]');
      const field = old?.closest('.field');
      if (!old || !field || field.querySelector('.choice-row')) return;
      const value = old.value;
      const row = document.createElement('div');
      row.className = 'choice-row';
      row.innerHTML = '<label><input type="radio" name="ancestor_tablet" value="有">有</label><label><input type="radio" name="ancestor_tablet" value="無">無</label>';
      field.replaceChild(row, old);
      const selected = row.querySelector(`[value="${CSS.escape(value)}"]`);
      if (selected) selected.checked = true;
    };

    const replaceAncestorTower = () => {
      const old = document.querySelector('#venue [name="ancestor_tower"]');
      if (!old || old.tagName === 'SELECT') return;
      const select = document.createElement('select');
      select.name = 'ancestor_tower';
      select.innerHTML = '<option value="">請選擇</option><option>東</option><option>南</option><option>西</option>';
      if (old.value) {
        if (![...select.options].some(option => option.value === old.value)) select.insertAdjacentHTML('beforeend', `<option>${old.value}</option>`);
        select.value = old.value;
      }
      old.replaceWith(select);
    };

    replaceAncestorTablet();
    replaceAncestorTower();
  })();

;

(() => {
    const form = document.querySelector('#caseForm');
    const arrangement = document.querySelector('#arrangement');
    const venue = document.querySelector('#venue');
    if (!form || !arrangement || !venue) return;

    // 分頁名稱調整。
    const aftercareTab = document.querySelector('.tabs button[data-tab="venue"]');
    if (aftercareTab) aftercareTab.textContent = '後續關懷';

    // 農曆改呈現在日期欄內，並還原欄位名稱。
    const updateLunarInside = date => {
      const field = date.closest('.field');
      const label = field?.querySelector(':scope > label');
      if (label) {
        const base = label.dataset.baseLabel || label.textContent.replace(/（(?:農曆：|[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]年農)[^）]+）/g, '').trim();
        label.dataset.baseLabel = base;
        label.textContent = base;
      }
      let lunar = date.parentElement.querySelector(':scope > .lunar-in-field');
      if (!lunar) {
        lunar = document.createElement('span');
        lunar.className = 'lunar-in-field';
        date.insertAdjacentElement('afterend', lunar);
      }
      if (field) field.classList.add('date-with-lunar');
      lunar.textContent = date.value ? lunarText(date.value) : '';
    };
    const updateAllLunarInside = () => form.querySelectorAll('input[type="date"]').forEach(updateLunarInside);
    updateAllLunarInside();
    form.addEventListener('change', event => {
      if (event.target.matches('input[type="date"]')) setTimeout(() => updateLunarInside(event.target), 0);
    });

    const fieldFor = (root, name) => root.querySelector(`[name="${name}"]`)?.closest('.field');

    // 館外接板獨立為有／無，原「儀式進行」只保留儀式選項。
    const ritualField = fieldFor(arrangement, 'outside_board');
    const selectedOutsideBoardValues = ritualField
      ? [...ritualField.querySelectorAll('input[name="outside_board"]')].filter(input => input.checked).map(input => input.value)
      : [];
    if (ritualField) {
      ritualField.querySelectorAll('input[name="outside_board"]').forEach(input => input.closest('label')?.remove());
      const title = ritualField.querySelector(':scope > label');
      if (title) title.textContent = '儀式進行';
    }
    const bodyCareField = fieldFor(arrangement, 'body_care');
    if (bodyCareField && !arrangement.querySelector('.outside-board-field')) {
      const outside = document.createElement('div');
      outside.className = 'field outside-board-field venue-choice';
      outside.innerHTML = '<label>館外接板</label><div class="choice-row"><label><input type="checkbox" name="outside_board" value="有">有</label><label><input type="checkbox" name="outside_board" value="無">無</label></div>';
      outside.querySelectorAll('input').forEach(input => {
        input.checked = selectedOutsideBoardValues.includes(input.value);
      });
      bodyCareField.insertAdjacentElement('afterend', outside);
    }

    // 相片樣式與佈置樣式互換位置。
    const decoration = fieldFor(arrangement, 'decoration_style');
    const photo = fieldFor(arrangement, 'photo_style');
    if (decoration && photo && decoration.parentElement === photo.parentElement) decoration.parentElement.insertBefore(photo, decoration);

    const toCheckboxOptions = name => {
      const old = arrangement.querySelector(`[name="${name}"]`);
      const field = old?.closest('.field');
      if (!old || !field || field.querySelector('.choice-row')) return;
      const values = String(old.value || '').split(',').map(value => value.trim()).filter(Boolean);
      const row = document.createElement('div');
      row.className = 'choice-row';
      row.innerHTML = `<label><input type="checkbox" name="${name}" value="有">有</label><label><input type="checkbox" name="${name}" value="無">無</label>`;
      field.replaceChild(row, old);
      row.querySelectorAll('input').forEach(input => input.checked = values.includes(input.value));
    };
    toCheckboxOptions('maosha');
    toCheckboxOptions('large_lamp');

    // 陣頭改為可持續新增的清單；內容同時寫回隱藏欄位，以便儲存案件。
    const procession = arrangement.querySelector('[name="procession"]');
    const processionField = procession?.closest('.field');
    if (procession && processionField && !document.querySelector('#processionTable')) {
      const saved = procession.value;
      const hidden = document.createElement('input');
      hidden.type = 'hidden';
      hidden.name = 'procession';
      const tableWrap = document.createElement('div');
      tableWrap.className = 'table-wrap';
      tableWrap.innerHTML = '<table class="data-table" id="processionTable"><thead><tr><th>陣頭</th><th></th></tr></thead><tbody></tbody></table>';
      const add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.textContent = '＋ 新增陣頭';
      procession.replaceWith(hidden, tableWrap, add);
      const tbody = tableWrap.querySelector('tbody');
      const sync = () => { hidden.value = [...tbody.querySelectorAll('input[name="procession_item"]')].map(input => input.value).filter(Boolean).join('\n'); };
      const addRow = value => {
        const row = document.createElement('tr');
        row.innerHTML = `<td><input name="procession_item" value="${String(value || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"></td><td><button type="button" class="btn remove" style="padding:6px 9px">刪除</button></td>`;
        row.querySelector('input').addEventListener('input', sync);
        row.querySelector('.remove').addEventListener('click', () => { row.remove(); sync(); updateMetrics(); });
        tbody.append(row);
      };
      (saved ? saved.split('\n') : ['']).forEach(addRow);
      add.addEventListener('click', () => { addRow(''); updateMetrics(); });
      sync();
    }
  })();

;

document.querySelector('#arrangement [name="staff_eldest_grandson"]')?.closest('.field')?.remove();

;

(() => {
    const arrangement = document.querySelector('#arrangement');
    const venue = document.querySelector('#venue');
    if (!arrangement || !venue) return;
    const fieldFor = (root, name) => root.querySelector(`[name="${name}"]`)?.closest('.field');

    // 相片樣式採可複選的固定選項。
    const photoInput = arrangement.querySelector('[name="photo_style"]');
    const photoField = photoInput?.closest('.field');
    if (photoInput && photoField && !photoField.querySelector('.choice-row')) {
      const current = String(photoInput.value || '').split(',').map(value => value.trim()).filter(Boolean);
      const row = document.createElement('div');
      row.className = 'choice-row';
      row.innerHTML = '<label><input type="checkbox" name="photo_style" value="15吋">15 吋</label><label><input type="checkbox" name="photo_style" value="大圖">大圖</label>';
      photoField.replaceChild(row, photoInput);
      row.querySelectorAll('input').forEach(input => input.checked = current.includes(input.value));
    }

    // 孝杖數量整合：男、長孫各自勾選並填寫數量。
    const staffField = fieldFor(arrangement, 'staff_male');
    const eldestField = fieldFor(arrangement, 'staff_eldest_grandson');
    if (staffField) {
      const title = staffField.querySelector(':scope > label');
      if (title) title.textContent = '孝杖數量';
      const oldInput = staffField.querySelector('[name="staff_male"]');
      if (oldInput && !staffField.querySelector('.staff-options')) {
        const maleValue = oldInput.value;
        const eldestValue = eldestField?.querySelector('[name="staff_eldest_grandson"]')?.value || '';
        const row = document.createElement('div');
        row.className = 'choice-row staff-options';
        row.innerHTML = '<label><input type="checkbox" name="staff_male_enabled">男</label><input type="number" min="0" name="staff_male" placeholder="數量"><label><input type="checkbox" name="staff_eldest_enabled">長孫</label><input type="number" min="0" name="staff_eldest_grandson" placeholder="數量">';
        staffField.replaceChild(row, oldInput);
        row.querySelector('[name="staff_male"]').value = maleValue;
        row.querySelector('[name="staff_eldest_grandson"]').value = eldestValue;
      }
      eldestField?.remove();
    }

    // 小燈數量排列在孝杖數量右側。
    const lamps = fieldFor(arrangement, 'small_lamps');
    if (staffField && lamps && staffField.parentElement === lamps.parentElement) staffField.parentElement.insertBefore(lamps, staffField.nextElementSibling);

    // 後續關懷：祖先牌位保留有／無外框，祖塔改回可自由填寫。
    const tabletField = fieldFor(venue, 'ancestor_tablet');
    tabletField?.classList.add('aftercare-choice');
    const ancestorTower = venue.querySelector('[name="ancestor_tower"]');
    if (ancestorTower?.tagName === 'SELECT') {
      const input = document.createElement('input');
      input.name = 'ancestor_tower';
      input.value = ancestorTower.value;
      ancestorTower.replaceWith(input);
    }

    const notesField = fieldFor(venue, 'notes');
    const notesLabel = notesField?.querySelector(':scope > label');
    if (notesLabel) notesLabel.textContent = '服務履歷';

    const notes = notesField?.querySelector('textarea[name="notes"]');
    if (notes) {
      configureAutoGrowingTextarea(notes);
    }
  })();

;

(() => {
    const field = document.querySelector('#ceremony [name="paper_offerings"]')?.closest('.field');
    const original = field?.querySelector('[name="paper_offerings"]');
    if (!field || !original || document.querySelector('#paperItemsTable')) return;

    const title = field.querySelector(':scope > label');
    if (title) title.textContent = '紙紮項目';
    const existing = original.value;
    const hidden = document.createElement('input');
    hidden.type = 'hidden';
    hidden.name = 'paper_offerings';
    const tableWrap = document.createElement('div');
    tableWrap.className = 'table-wrap';
    tableWrap.innerHTML = '<table class="data-table" id="paperItemsTable"><thead><tr><th>紙紮項目</th><th></th></tr></thead><tbody></tbody></table>';
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'add';
    add.textContent = '＋ 新增紙紮項目';
    original.replaceWith(hidden, tableWrap, add);

    const tbody = tableWrap.querySelector('tbody');
    const sync = () => { hidden.value = [...tbody.querySelectorAll('input[name="paper_item"]')].map(input => input.value).filter(Boolean).join('\n'); };
    const addRow = value => {
      const row = document.createElement('tr');
      row.innerHTML = `<td><input name="paper_item" value="${String(value || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"></td><td><button type="button" class="btn remove" style="padding:6px 9px">刪除</button></td>`;
      row.querySelector('input').addEventListener('input', sync);
      row.querySelector('.remove').addEventListener('click', () => { row.remove(); sync(); updateMetrics(); });
      tbody.append(row);
    };
    (existing ? existing.split('\n') : ['']).forEach(addRow);
    add.addEventListener('click', () => { addRow(''); updateMetrics(); });
    sync();
  })();

;

(() => {
    const old = document.querySelector('#arrangement [name="condolence_money"]');
    const field = old?.closest('.field');
    if (!old || !field || field.querySelector('.choice-row')) return;
    const values = String(old.value || '').split(',').map(value => value.trim()).filter(Boolean);
    const row = document.createElement('div');
    row.className = 'choice-row';
    row.innerHTML = '<label><input type="checkbox" name="condolence_money" value="有">有</label><label><input type="checkbox" name="condolence_money" value="無">無</label>';
    field.replaceChild(row, old);
    row.querySelectorAll('input').forEach(input => input.checked = values.includes(input.value));
  })();

;

(() => {
    const cleanLabel = label => {
      const base = label.textContent.replace(/（(?:農曆：|[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]年農)[^）]+）/g, '').trim();
      label.dataset.baseLabel = base;
      label.textContent = base;
    };
    const refresh = date => {
      const field = date.closest('.field');
      const label = field?.querySelector(':scope > label');
      if (label) cleanLabel(label);
      let lunar = date.parentElement.querySelector(':scope > .lunar-in-field');
      if (!lunar) {
        lunar = document.createElement('span');
        lunar.className = 'lunar-in-field';
        date.insertAdjacentElement('afterend', lunar);
      }
      lunar.textContent = date.value ? lunarText(date.value) : '';
    };
    document.querySelectorAll('#caseForm input[type="date"]').forEach(refresh);
    document.querySelector('#caseForm')?.addEventListener('change', event => {
      if (event.target.matches('input[type="date"]')) setTimeout(() => refresh(event.target), 0);
    });
  })();

;

(() => {
    const religionField = document.querySelector('#basic [name="religion"]')?.closest('.field');
    religionField?.classList.add('religion-compact');

    // 再次清除舊版農曆標題；農曆只保留在日期框內。
    const refreshBasicLunar = date => {
      const field = date.closest('.field');
      const label = field?.querySelector(':scope > label');
      if (label) {
        const clean = label.textContent.replace(/（(?:農曆：|[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]年農)[^）]+）/g, '').trim();
        label.dataset.baseLabel = clean;
        label.textContent = clean;
      }
      let lunar = date.parentElement.querySelector(':scope > .lunar-in-field');
      if (!lunar) {
        lunar = document.createElement('span');
        lunar.className = 'lunar-in-field';
        date.insertAdjacentElement('afterend', lunar);
      }
      lunar.textContent = date.value ? lunarText(date.value) : '';
    };
    document.querySelectorAll('#basic input[type="date"]').forEach(refreshBasicLunar);
    document.querySelector('#basic')?.addEventListener('change', event => {
      if (event.target.matches('input[type="date"]')) setTimeout(() => refreshBasicLunar(event.target), 0);
    });
  })();

;

(() => {
    const basic = document.querySelector('#basic');
    const ceremony = document.querySelector('#ceremony');
    if (!basic || !ceremony) return;

    // 出殯日期與其他日期一致：國曆完整顯示，農曆放在欄位名稱。
    const setBasicLunarLabel = date => {
      const field = date.closest('.field');
      const label = field?.querySelector(':scope > label');
      if (!label) return;
      const base = label.textContent.replace(/（(?:農曆：|[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]年農)[^）]+）/g, '').trim();
      label.dataset.baseLabel = base;
      label.textContent = date.value ? `${base}（${lunarText(date.value)}）` : base;
      field.querySelectorAll('.lunar-in-field').forEach(item => item.remove());
      date.style.paddingRight = '11px';
    };
    basic.querySelectorAll('input[type="date"]').forEach(setBasicLunarLabel);
    basic.addEventListener('change', event => {
      if (event.target.matches('input[type="date"]')) setTimeout(() => setBasicLunarLabel(event.target), 0);
    });

    const paperField = ceremony.querySelector('#paperItemsTable')?.closest('.field');
    if (!paperField) return;
    paperField.classList.remove('wide');
    paperField.classList.add('paper-compact');

    // 建立可新增的庫錢數量欄位，內容同步寫入隱藏欄位供案件儲存。
    if (!document.querySelector('#paperMoneyTable')) {
      const moneyField = document.createElement('div');
      moneyField.className = 'field paper-compact';
      moneyField.innerHTML = '<label>庫錢</label><input type="hidden" name="paper_money"><div class="table-wrap"><table class="data-table" id="paperMoneyTable"><thead><tr><th>庫錢數量</th><th></th></tr></thead><tbody></tbody></table></div><button type="button" class="add">＋ 新增庫錢</button>';
      paperField.insertAdjacentElement('afterend', moneyField);
      const hidden = moneyField.querySelector('[name="paper_money"]');
      const tbody = moneyField.querySelector('tbody');
      const sync = () => { hidden.value = [...tbody.querySelectorAll('input')].map(input => input.value).filter(Boolean).join('\n'); };
      const addRow = value => {
        const row = document.createElement('tr');
        row.innerHTML = `<td><input type="number" min="0" inputmode="numeric" name="paper_money_item" value="${String(value || '').replace(/"/g, '&quot;')}"></td><td><button type="button" class="btn remove" style="padding:6px 9px">刪除</button></td>`;
        row.querySelector('input').addEventListener('input', sync);
        row.querySelector('.remove').addEventListener('click', () => { row.remove(); sync(); updateMetrics(); });
        tbody.append(row);
      };
      addRow('');
      moneyField.querySelector('.add').addEventListener('click', () => { addRow(''); updateMetrics(); });
    }
  })();

;

(() => {
    const table = document.querySelector('#paperMoneyTable');
    if (!table) return;
    const field = table.closest('.field');
    const hidden = field?.querySelector('[name="paper_money"]');
    const tbody = table.querySelector('tbody');
    if (!field || !hidden || !tbody) return;

    table.querySelector('thead').innerHTML = '<tr><th>日期</th><th>數量</th><th>地點</th><th></th></tr>';
    const sync = () => {
      hidden.value = [...tbody.rows].map(row => {
        const date = row.querySelector('[name="paper_money_date"]')?.value || '';
        const quantity = row.querySelector('[name="paper_money_item"]')?.value || '';
        const location = row.querySelector('[name="paper_money_location"]')?.value || '';
        return [date, quantity, location].join('|');
      }).filter(value => value !== '||').join('\n');
    };
    const addRow = values => {
      const row = document.createElement('tr');
      row.innerHTML = '<td><input type="date" name="paper_money_date"></td><td><input type="number" min="0" inputmode="numeric" name="paper_money_item"></td><td><input name="paper_money_location"></td><td><button type="button" class="btn remove" style="padding:6px 9px">刪除</button></td>';
      row.querySelector('[name="paper_money_date"]').value = values?.date || '';
      row.querySelector('[name="paper_money_item"]').value = values?.quantity || '';
      row.querySelector('[name="paper_money_location"]').value = values?.location || '';
      row.querySelectorAll('input').forEach(input => input.addEventListener('input', sync));
      row.querySelectorAll('input').forEach(input => input.addEventListener('change', sync));
      row.querySelector('.remove').addEventListener('click', () => { row.remove(); sync(); updateMetrics(); });
      tbody.append(row);
    };

    const oldValues = [...tbody.querySelectorAll('[name="paper_money_item"]')].map(input => ({ quantity: input.value }));
    tbody.innerHTML = '';
    (oldValues.length ? oldValues : [{}]).forEach(addRow);

    const oldAdd = field.querySelector('.add');
    const add = oldAdd.cloneNode(true);
    oldAdd.replaceWith(add);
    add.addEventListener('click', () => { addRow({}); updateMetrics(); });
    sync();
  })();

;

(() => {
    // 移除不需要的分頁標題與說明。
    ['venue', 'vendors'].forEach(id => {
      const pane = document.querySelector('#' + id);
      pane?.querySelector(':scope > .section-title')?.remove();
      pane?.querySelector(':scope > .hint')?.remove();
    });
    document.querySelector('#ceremony > .hint')?.remove();

    // 庫錢移到紙紮項目下方的獨立一列。
    const moneyField = document.querySelector('#paperMoneyTable')?.closest('.field');
    moneyField?.classList.add('paper-money-row');
  })();

;

(() => {
    const people = document.querySelector('#arrangement [name="band_people"]');
    if (people) {
      people.max = '99';
      people.setAttribute('inputmode', 'numeric');
      people.setAttribute('aria-label', '樂隊人數');
    }
  })();

;

(() => {
    const toIso = value => {
      const match = String(value || '').trim().match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
      return match ? `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}` : '';
    };
    const toDisplay = value => value ? value.replaceAll('-', '/') : '';
    const updateBasicLunar = input => {
      const field = input.closest('#basic .field');
      const label = field?.querySelector(':scope > label');
      if (!label) return;
      const base = label.dataset.baseLabel || label.textContent.replace(/（(?:農曆：|[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]年農)[^）]+）/g, '').trim();
      label.dataset.baseLabel = base;
      const iso = toIso(input.value);
      label.textContent = iso ? `${base}（${lunarText(iso)}）` : base;
    };
    const convertDate = input => {
      if (input.dataset.dateText) return;
      const value = input.value;
      input.type = 'text';
      input.dataset.dateText = 'true';
      input.inputMode = 'numeric';
      input.placeholder = '年/月/日';
      input.value = toDisplay(value);
      updateBasicLunar(input);
    };
    const convertAllDates = root => root.querySelectorAll('input[type="date"]').forEach(convertDate);
    convertAllDates(document);
    document.addEventListener('input', event => {
      if (event.target.matches('input[data-date-text]')) updateBasicLunar(event.target);
    });
    document.addEventListener('change', event => {
      if (event.target.matches('input[data-date-text]')) updateBasicLunar(event.target);
    });
    document.addEventListener('click', event => {
      if (event.target.closest('button.add, [data-add]')) setTimeout(() => convertAllDates(document), 0);
    });
  })();

;

(() => {
    const arrangement = document.querySelector('#arrangement');
    if (!arrangement) return;
    const fieldFor = name => arrangement.querySelector(`[name="${name}"]`)?.closest('.field');
    const dress = fieldFor('mourning_dress');
    const band = fieldFor('band');
    const hearse = fieldFor('hearse');
    const doubleTowel = fieldFor('double_towel');
    const food = fieldFor('food_note');
    const grid = dress?.closest('.form-grid');
    if (!grid || !band || !hearse || !doubleTowel) return;

    grid.classList.add('service-layout-grid');
    dress.classList.add('service-dress');
    band.classList.add('service-band');
    doubleTowel.classList.add('service-double-towel');
    hearse.classList.add('service-hearse');
    food?.classList.add('service-food');
    [dress, band, doubleTowel, hearse, food].filter(Boolean).forEach(field => grid.append(field));
  })();

;

(() => {
    const isoDate = value => {
      const parts = String(value || '').trim().match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
      return parts ? `${parts[1]}-${parts[2].padStart(2, '0')}-${parts[3].padStart(2, '0')}` : '';
    };

    const refreshLunarLabel = input => {
      const field = input.closest('#basic .field');
      const label = field?.querySelector(':scope > label');
      if (!label) return;
      const base = label.dataset.baseLabel || label.textContent.replace(/\s*（(?:農曆：|[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]年農)[^）]*）\s*$/, '').trim();
      label.dataset.baseLabel = base;
      label.textContent = input.value ? `${base}（${lunarText(input.value)}）` : base;
    };

    const restoreDatePickers = root => {
      root.querySelectorAll('input[data-date-text], input[type="date"]').forEach(input => {
        if (input.dataset.dateText) {
          const value = isoDate(input.value);
          input.type = 'date';
          input.value = value;
          delete input.dataset.dateText;
          input.removeAttribute('inputmode');
        }
        refreshLunarLabel(input);
      });
    };

    restoreDatePickers(document);
    document.addEventListener('change', event => {
      if (event.target.matches('#caseForm input[type="date"]')) refreshLunarLabel(event.target);
    });
    document.addEventListener('click', () => setTimeout(() => restoreDatePickers(document), 0));
  })();

;

(() => {
    const dateLabels = {
      funeral_date: '出殯日期',
      birth_date: '出生日期',
      death_date: '過世日期'
    };

    const toIsoDate = value => {
      const parts = String(value || '').trim().match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
      return parts ? `${parts[1]}-${parts[2].padStart(2, '0')}-${parts[3].padStart(2, '0')}` : '';
    };

    const updateBasicLunar = input => {
      const base = dateLabels[input.name];
      if (!base) return;
      const label = input.closest('.field')?.querySelector(':scope > label');
      if (!label) return;
      label.textContent = input.value ? `${base}（${lunarText(input.value)}）` : base;
    };

    const restoreDateInputs = root => {
      root.querySelectorAll('input[data-date-text], input[type="date"]').forEach(input => {
        if (input.dataset.dateText) {
          const value = toIsoDate(input.value);
          input.type = 'date';
          input.value = value;
          delete input.dataset.dateText;
          input.removeAttribute('inputmode');
        }
        updateBasicLunar(input);
      });
    };

    restoreDateInputs(document);
    for (const eventName of ['input', 'change']) {
      document.addEventListener(eventName, event => {
        if (event.target.matches('#caseForm input[type="date"]')) updateBasicLunar(event.target);
      }, true);
    }
    document.addEventListener('click', () => setTimeout(() => restoreDateInputs(document), 0), true);
  })();

;

(() => {
    const labels = {
      funeral_date: '出殯日期',
      birth_date: '出生日期',
      death_date: '過世日期'
    };

    const refreshLunar = input => {
      const baseLabel = labels[input.name];
      const field = input.closest('#basic .field');
      const label = field?.querySelector(':scope > label');
      if (!baseLabel || !label) return;
      label.textContent = input.value ? `${baseLabel}（${lunarText(input.value)}）` : baseLabel;
    };

    const refreshAfterPicker = input => {
      refreshLunar(input);
      setTimeout(() => refreshLunar(input), 0);
    };

    document.querySelectorAll('#basic input[type="date"]').forEach(refreshLunar);
    ['input', 'change'].forEach(eventName => {
      document.addEventListener(eventName, event => {
        if (event.target.matches('#basic input[type="date"]')) refreshAfterPicker(event.target);
      }, true);
    });
  })();

;

(() => {
    const basicDateNames = new Set(['funeral_date', 'birth_date', 'death_date']);

    const removeDatePicker = input => {
      if (input.type !== 'date') return;
      const value = input.value;
      input.type = 'text';
      input.placeholder = 'YYY/MM/DD';
      input.inputMode = 'numeric';
      input.pattern = '\\d{3}[/-]\\d{1,2}[/-]\\d{1,2}';
      if (value) input.value = value.replaceAll('-', '/');
    };

    const removeAllDatePickers = root => {
      root.querySelectorAll('input[type="date"]').forEach(removeDatePicker);
    };

    const updateBasicLunarFromText = input => {
      if (!basicDateNames.has(input.name)) return;
      const label = input.closest('#basic .field')?.querySelector(':scope > label');
      if (!label) return;
      const base = { funeral_date: '出殯日期', birth_date: '出生日期', death_date: '過世日期' }[input.name];
      const value = input.value.replaceAll('/', '-');
      label.textContent = value ? `${base}（${lunarText(value)}）` : base;
    };

    removeAllDatePickers(document);
    document.addEventListener('input', event => {
      if (event.target.matches('#basic input[name="funeral_date"], #basic input[name="birth_date"], #basic input[name="death_date"]')) {
        updateBasicLunarFromText(event.target);
      }
    });

    // 動態新增的庫錢、法事等日期欄位也保持為直接輸入，避免舊程式重新帶回選擇器。
    const observer = new MutationObserver(() => removeAllDatePickers(document));
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('click', () => setTimeout(() => removeAllDatePickers(document), 0), true);
  })();

;

(() => {
  const basicDates = {
    funeral_date: '出殯日期',
    birth_date: '出生日期',
    death_date: '過世日期'
  };

  const toIsoDate = value => {
    const match = String(value || '').trim().match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;

    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const updateBasicLunarLabel = input => {
    const baseLabel = basicDates[input.name];
    if (!baseLabel) return;

    const label = input.closest('#basic .field')?.querySelector(':scope > label');
    if (!label) return;

    const isoDate = toIsoDate(input.value);
    if (!isoDate) {
      label.textContent = baseLabel;
      return;
    }

    try {
      label.textContent = `${baseLabel}（${lunarText(isoDate)}）`;
    } catch {
      label.textContent = baseLabel;
    }
  };

  const basicDateSelector = '#basic input[name="funeral_date"], #basic input[name="birth_date"], #basic input[name="death_date"]';
  document.querySelectorAll(basicDateSelector).forEach(updateBasicLunarLabel);

  ['input', 'change'].forEach(eventName => {
    document.addEventListener(eventName, event => {
      if (event.target.matches(basicDateSelector)) updateBasicLunarLabel(event.target);
    }, true);
  });
})();

// 手機版導覽列預設收合，需要時再展開，避免占用表單畫面高度。
(() => {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar || sidebar.querySelector('.mobile-nav-toggle')) return;

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'mobile-nav-toggle';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.textContent = '☰ 選單';
  sidebar.append(toggle);

  const isMobile = () => window.matchMedia('(max-width: 850px), (max-width: 1024px) and (max-height: 600px)').matches;
  const setCollapsed = collapsed => {
    sidebar.classList.toggle('mobile-collapsed', collapsed && isMobile());
    const expanded = !sidebar.classList.contains('mobile-collapsed');
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.setAttribute('aria-label', expanded ? '收合選單' : '展開選單');
    toggle.textContent = expanded ? '收合 ▲' : '☰';
  };

  toggle.addEventListener('click', () => {
    setCollapsed(!sidebar.classList.contains('mobile-collapsed'));
  });
  sidebar.addEventListener('click', event => {
    if (event.target.closest('.mobile-nav-toggle')) return;
    if (isMobile() && event.target.closest('button')) setCollapsed(true);
  });
  window.addEventListener('resize', () => setCollapsed(isMobile()));
  setCollapsed(isMobile());
})();

;

(() => {
  const normalize = value => String(value || '').replace(/\s+/g, '').trim();

  const fieldByLabel = (root, labelText) =>
    [...root.querySelectorAll('.field')].find(field =>
      normalize(field.querySelector(':scope > label')?.textContent) === labelText
    );

  const venue = document.getElementById('venue');
  if (venue) {
    [
      '相片樣式',
      '佈置樣式',
      '奠禮供品',
      '茅沙準備',
      '大燈製做',
      '孝杖數量',
      '小燈數量'
    ].forEach(label => fieldByLabel(venue, label)?.classList.add('uniform-venue-field'));
  }

  const tabs = document.querySelector('.tabs');
  const tabSection = tabs?.parentElement;
  const ritualTab = [...(tabs?.querySelectorAll('button') || [])]
    .find(button => normalize(button.textContent) === '法事確認單');
  const ritualPaneId = ritualTab?.dataset.tab;
  ritualTab?.remove();
  if (ritualPaneId) document.getElementById(ritualPaneId)?.remove();

  if (!tabs || !tabSection) return;
  document.querySelector('[data-tab="upload-files-pane"]')?.remove();
  document.getElementById('upload-files-pane')?.remove();

  const uploadTab = document.createElement('button');
  uploadTab.type = 'button';
  uploadTab.dataset.tab = 'upload-files-pane';
  uploadTab.textContent = '檔案上傳';

  const uploadPane = document.createElement('section');
  uploadPane.id = 'upload-files-pane';
  uploadPane.className = 'pane';
  uploadPane.innerHTML = `
    <div class="upload-card">
      <h2 class="section-title">檔案上傳</h2>
      <p class="hint">請選擇要附在本案件的圖片、文件或 PDF。</p>
      <label class="upload-picker" for="case-attachment-input">選擇檔案</label>
      <input id="case-attachment-input" type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx">
      <ul id="case-attachment-list"><li class="empty">尚未選擇檔案</li></ul>
    </div>
  `;

  tabs.append(uploadTab);
  tabSection.append(uploadPane);

  uploadTab.addEventListener('click', () => {
    tabs.querySelectorAll('button').forEach(button =>
      button.classList.toggle('active', button === uploadTab)
    );
    tabSection.querySelectorAll('.pane').forEach(pane =>
      pane.classList.toggle('active', pane === uploadPane)
    );
  });

  const input = uploadPane.querySelector('#case-attachment-input');
  const list = uploadPane.querySelector('#case-attachment-list');
  let attachments = [];

  const syncInput = () => {
    try {
      const transfer = new DataTransfer();
      attachments.forEach(item => transfer.items.add(item.file));
      input.files = transfer.files;
    } catch {
      input.value = '';
    }
  };

  const renderAttachments = () => {
    list.replaceChildren();
    if (!attachments.length) {
      const empty = document.createElement('li');
      empty.className = 'empty';
      empty.textContent = '尚未選擇檔案';
      list.append(empty);
      return;
    }

    attachments.forEach((attachment, index) => {
      const item = document.createElement('li');
      item.className = 'attachment-row';

      const name = document.createElement('span');
      name.className = 'attachment-name';
      name.textContent = attachment.file.name;

      const review = document.createElement('button');
      review.type = 'button';
      review.className = 'attachment-action';
      review.textContent = '檢閱';
      review.addEventListener('click', () => {
        if (attachment.file.type.startsWith('image/') || attachment.file.type === 'application/pdf') {
          window.open(attachment.url, '_blank', 'noopener');
          return;
        }
        const link = document.createElement('a');
        link.href = attachment.url;
        link.download = attachment.file.name;
        link.click();
      });

      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'attachment-action attachment-delete';
      removeButton.textContent = '刪除';
      removeButton.setAttribute('aria-label', `刪除檔案 ${attachment.file.name}`);
      removeButton.addEventListener('click', () => {
        URL.revokeObjectURL(attachment.url);
        attachments.splice(index, 1);
        syncInput();
        renderAttachments();
      });

      item.append(name, review, removeButton);
      list.append(item);
    });
  };

  const clearAttachments = () => {
    attachments.forEach(item => URL.revokeObjectURL(item.url));
    attachments = [];
    input.value = '';
    renderAttachments();
  };

  input.addEventListener('change', () => {
    [...input.files].forEach(file => {
      const duplicate = attachments.some(item =>
        item.file.name === file.name &&
        item.file.size === file.size &&
        item.file.lastModified === file.lastModified
      );
      if (!duplicate) attachments.push({ file, url: URL.createObjectURL(file) });
    });
    syncInput();
    renderAttachments();
  });

  document.getElementById('caseForm')?.addEventListener('reset', () => {
    window.setTimeout(clearAttachments, 0);
  });
  window.__clearCaseAttachments = clearAttachments;
  renderAttachments();
})();

;

(() => {
  const removeField = (labelText) => {
    document.querySelectorAll('.field').forEach((field) => {
      const label = field.querySelector(':scope > label');
      if (label && label.textContent.trim() === labelText) field.remove();
    });
  };

  const apply = () => {
    removeField('孝杖數量');
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.setTimeout(apply, 0));
  } else {
    window.setTimeout(apply, 0);
  }
})();

;

(() => {
  const nav = document.querySelector('.sidebar .nav');
  const formDashboard = document.querySelector('.dashboard');
  const caseNumber = document.querySelector('[name="case_no"]');
  if (!nav || !formDashboard || !caseNumber) return;

  caseNumber.removeAttribute('readonly');
  caseNumber.required = true;
  caseNumber.placeholder = '請自行輸入案件編號';

  const savedDraft = JSON.parse(localStorage.getItem('funeral-case-draft-v1') || 'null');
  if (!savedDraft?.fields?.case_no) caseNumber.value = '';

  const overviewButton = document.createElement('button');
  overviewButton.type = 'button';
  overviewButton.textContent = '⌂　案件總覽';
  nav.prepend(overviewButton);

  const overview = document.createElement('section');
  overview.className = 'case-overview-view';
  overview.innerHTML = `
    <div class="overview-cards">
      <div class="card"><div class="metric">全部案件</div><div class="number" data-overview="total">0</div></div>
      <div class="card"><div class="metric">本月新增</div><div class="number" data-overview="month">0</div></div>
      <div class="card"><div class="metric">近期出殯</div><div class="number" data-overview="upcoming">0</div></div>
      <div class="card"><div class="metric">待廠商確認</div><div class="number" data-overview="vendors">0</div></div>
    </div>
    <div class="overview-list">
      <h2>近期案件</h2>
      <div class="overview-list-content"></div>
    </div>
  `;
  formDashboard.before(overview);
})();

;

(() => {
  const arrangement = document.getElementById('arrangement');
  const largeLamp = arrangement?.querySelector('[name="large_lamp"]')?.closest('.field');
  if (!arrangement || !largeLamp || arrangement.querySelector('.new-filial-staff-field')) return;

  const field = document.createElement('div');
  field.className = 'field new-filial-staff-field';
  field.innerHTML = `
    <label>孝杖</label>
    <div class="choice-row">
      <label class="filial-staff-option">
        <input name="filial_son_enabled" type="checkbox">
        孝男
        <input class="filial-staff-short-input" name="filial_son_value" type="text" maxlength="2" aria-label="孝男欄位">
      </label>
      <label class="filial-staff-option">
        <input name="eldest_grandson_enabled" type="checkbox">
        長孫
        <input class="filial-staff-short-input" name="eldest_grandson_value" type="text" maxlength="2" aria-label="長孫欄位">
      </label>
    </div>
  `;
  largeLamp.insertAdjacentElement('afterend', field);

  const savedDraft = JSON.parse(localStorage.getItem('funeral-case-draft-v1') || 'null');
  if (savedDraft?.fields) {
    ['filial_son_enabled', 'eldest_grandson_enabled'].forEach(name => {
      field.querySelector(`[name="${name}"]`).checked = Boolean(savedDraft.fields[name]);
    });
    ['filial_son_value', 'eldest_grandson_value'].forEach(name => {
      field.querySelector(`[name="${name}"]`).value = savedDraft.fields[name] || '';
    });
  }
  updateMetrics();
})();

;

(() => {
  const caseForm = document.getElementById('caseForm');
  const topSaveButton = document.getElementById('saveTop');
  const draftKey = 'funeral-case-draft-v1';
  const recordsKey = 'funeral-case-records-v1';
  if (!caseForm || !topSaveButton) return;

  const readRecords = () => {
    try {
      const value = JSON.parse(localStorage.getItem(recordsKey) || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  };

  const showSaveStatus = (message, isError = false) => {
    const status = document.getElementById('status');
    if (!status) return;
    status.textContent = message;
    status.style.background = isError ? '#9f2d2d' : '#163f3b';
    status.classList.add('show');
    window.setTimeout(() => status.classList.remove('show'), 2600);
  };

  const saveCase = () => {
    if (typeof window.validateAllCaseDates === 'function' && !window.validateAllCaseDates()) {
      showSaveStatus('日期格式必須是 YYY/MM/DD', true);
      return false;
    }
    if (!caseForm.reportValidity()) {
      showSaveStatus('請先填寫案件編號與案名', true);
      return false;
    }

    try {
      const data = collect();
      data.fields.case_no = String(data.fields.case_no || '').trim();
      data.fields.case_name = String(data.fields.case_name || '').trim();
      data.saved_at = new Date().toISOString();

      localStorage.setItem(draftKey, JSON.stringify(data));

      const records = readRecords();
      const editingCaseNo = String(window.__editingCaseNo || '').trim();
      const existingIndex = records.findIndex(record =>
        String(record?.fields?.case_no || '').trim() === (editingCaseNo || data.fields.case_no)
      );
      if (existingIndex >= 0) records[existingIndex] = data;
      else records.push(data);
      localStorage.setItem(recordsKey, JSON.stringify(records));
      document.dispatchEvent(new CustomEvent('funeral:case-saved'));
      if (editingCaseNo) {
        window.__editingCaseNo = data.fields.case_no;
        syncEditCaseTitle();
      }

      markCaseSaved();
      updateMetrics();
      showSaveStatus(`案件 ${data.fields.case_no} 已儲存`);
      return true;
    } catch (error) {
      console.error('儲存案件失敗', error);
      showSaveStatus(`儲存失敗：${error?.message || '未知錯誤'}`, true);
      return false;
    }
  };

  /* 取代舊的流水號、草稿與列表多層儲存包裝。 */
  window.save = saveCase;
  topSaveButton.onclick = null;
  topSaveButton.addEventListener('click', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    saveCase();
  });

  caseForm.addEventListener('submit', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    saveCase();
  }, true);
})();

;

(() => {
  const caseForm = document.getElementById('caseForm');
  if (!caseForm) return;

  /*
   * 安全載入案件：不存在的舊分頁或表格直接略過，
   * 讓案件列表的「編輯」可以確實打開已儲存案件。
   */
  const loadCaseSafely = data => {
    if (!data || typeof data !== 'object') return false;
    caseForm.reset();

    ['contacts', 'schedules', 'vendorsTable', 'ritualsTable'].forEach(id => {
      const body = document.querySelector(`#${id} tbody`);
      if (body) body.innerHTML = '';
    });

    Object.entries(data.fields || {}).forEach(([name, value]) => {
      if (applyStoredChoiceValue(caseForm, name, value)) return;
      const control = caseForm.elements[name];
      if (control) control.value = value ?? '';
    });

    const addSavedRows = (tableId, items) => {
      if (!document.querySelector(`#${tableId} tbody`)) return;
      (Array.isArray(items) ? items : []).forEach(item => addRow(tableId, item));
    };
    addSavedRows('contacts', data.contacts);
    addSavedRows('schedules', data.schedules);
    addSavedRows('vendorsTable', data.vendors);
    addSavedRows('ritualsTable', data.rituals);

    if (document.querySelector('#contacts tbody')?.rows.length === 0) addRow('contacts');
    if (document.querySelector('#schedules tbody')?.rows.length === 0) addRow('schedules');

    syncLunarDates();
    updateMetrics();
    window.setTimeout(() => {
      if (typeof window.prepareAllCaseDates === 'function') window.prepareAllCaseDates();
      window.__refreshVenueLunarLabels?.();
      markCaseSaved();
    }, 0);
    return true;
  };
  window.load = loadCaseSafely;

  const dateNamePattern = /(date|day|anniversary)/i;
  const nonDateNames = new Set(['date_selection']);
  const isDateInput = input =>
    input instanceof HTMLInputElement &&
    input.type !== 'time' &&
    !nonDateNames.has(input.name || '') &&
    !/^selection_lunar_/.test(input.name || '') &&
    (
      input.type === 'date' ||
      input.dataset.dateText != null ||
      input.placeholder === 'YYY/MM/DD' ||
      input.placeholder === 'YYYY/MM/DD' ||
      dateNamePattern.test(input.name || '')
    );

  const formatDateCharacters = input => {
    if (input.type === 'date') {
      const current = input.value;
      input.type = 'text';
      if (current) input.value = current.replaceAll('-', '/');
    }
    let rawValue = String(input.value || '');
    const legacy = rawValue.replace(/\D/g, '').match(/^(\d{4})(\d{2})(\d{2})$/);
    if (legacy && Number(legacy[1]) >= 1912) {
      rawValue = `${String(Number(legacy[1]) - 1911).padStart(3, '0')}${legacy[2]}${legacy[3]}`;
    }
    const yearDigits = 3;
    const digits = rawValue.replace(/\D/g, '').slice(0, yearDigits + 4);
    if (digits.length <= yearDigits) input.value = digits;
    else if (digits.length <= yearDigits + 2) input.value = `${digits.slice(0, yearDigits)}/${digits.slice(yearDigits)}`;
    else input.value = `${digits.slice(0, yearDigits)}/${digits.slice(yearDigits, yearDigits + 2)}/${digits.slice(yearDigits + 2)}`;
  };

  const isRealDate = value => {
    const raw = String(value || '').trim();
    const packed = raw.match(/^(\d{3})(\d{2})(\d{2})$/);
    const match = packed || raw.match(/^(\d{3})[\/-](\d{2})[\/-](\d{2})$/);
    if (!match) return false;
    const enteredYear = Number(match[1]);
    const year = enteredYear + 1911;
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day);
    return enteredYear >= 1 &&
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day;
  };

  const validateDate = input => {
    const value = input.value.trim();
    const valid = !value || isRealDate(value);
    input.setCustomValidity(valid ? '' : '請輸入有效日期，格式必須是 YYY/MM/DD，例如 115/07/23');
    input.classList.toggle('date-invalid', !valid);
    return valid;
  };

  const prepareDate = input => {
    if (!isDateInput(input)) return;
    if (input.type === 'date') {
      const current = input.value;
      input.type = 'text';
      if (current) input.value = current.replaceAll('-', '/');
    }
    delete input.dataset.dateText;
    input.classList.add('exact-date-input');
    input.placeholder = input.name === 'funeral_date'
      ? '輸入國曆日期，如0690812'
      : 'YYY/MM/DD';
    input.inputMode = 'numeric';
    input.maxLength = 9;
    input.minLength = 7;
    input.pattern = '(?:\\d{3}[\\/-]\\d{2}[\\/-]\\d{2}|\\d{7})';
    formatDateCharacters(input);
    validateDate(input);
  };

  window.prepareAllCaseDates = () => {
    caseForm.querySelectorAll('input').forEach(prepareDate);
  };

  window.validateAllCaseDates = () => {
    let valid = true;
    let firstInvalid = null;
    caseForm.querySelectorAll('input').forEach(input => {
      if (!isDateInput(input)) return;
      formatDateCharacters(input);
      if (!validateDate(input)) {
        valid = false;
        if (!firstInvalid) firstInvalid = input;
      }
    });
    if (firstInvalid) {
      const pane = firstInvalid.closest('.pane');
      if (pane && !pane.classList.contains('active')) {
        const tab = document.querySelector(`.tabs button[data-tab="${pane.id}"]`);
        tab?.click();
      }
      firstInvalid.reportValidity();
      firstInvalid.focus();
    }
    return valid;
  };

  caseForm.addEventListener('input', event => {
    if (!isDateInput(event.target)) return;
    formatDateCharacters(event.target);
    validateDate(event.target);
  }, true);

  caseForm.addEventListener('blur', event => {
    if (isDateInput(event.target)) validateDate(event.target);
  }, true);

  const observer = new MutationObserver(() => window.prepareAllCaseDates());
  observer.observe(caseForm, { childList: true, subtree: true });
  window.prepareAllCaseDates();
})();

;

document.getElementById('saveTop')?.remove();
  document.querySelector('.top .actions button[onclick*="window.print"]')?.remove();

;

(() => {
  const recordsKey = 'funeral-case-records-v1';

  const readRecords = () => {
    try {
      const value = JSON.parse(localStorage.getItem(recordsKey) || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  };

  const recordForRow = row => {
    const records = readRecords();
    const caseNo = String(row?.dataset?.caseNo || '').trim();
    if (caseNo) {
      return records.find(record =>
        String(record?.fields?.case_no || '').trim() === caseNo
      ) || null;
    }
    const rows = [...document.querySelectorAll('.case-list-view .case-list-row')];
    const index = rows.indexOf(row);
    const sorted = [...records].sort((a, b) =>
      String(a?.fields?.case_no || '').localeCompare(String(b?.fields?.case_no || ''), 'zh-Hant', { numeric: true })
    );
    return index >= 0 ? sorted[index] : null;
  };

  const populateFormDirectly = record => {
    const form = document.getElementById('caseForm');
    if (!form || !record) throw new Error('找不到案件表單或案件資料');
    const archiveSelection = document.querySelector('.case-archive-navigation button.archive-active');
    window.__editingCaseNo = String(record?.fields?.case_no || '').trim();
    HTMLFormElement.prototype.reset.call(form);

    ['contacts', 'schedules', 'vendorsTable', 'ritualsTable'].forEach(id => {
      const body = document.querySelector(`#${id} tbody`);
      if (body) body.innerHTML = '';
    });

    Object.entries(record.fields || {}).forEach(([name, value]) => {
      if (applyStoredChoiceValue(form, name, value)) return;
      const control = form.elements[name];
      if (control) control.value = value ?? '';
    });
    refreshBasicTimeBranches(form);

    const appendRows = (tableId, items) => {
      if (!document.querySelector(`#${tableId} tbody`)) return;
      (Array.isArray(items) ? items : []).forEach(item => addRow(tableId, item));
    };
    appendRows('contacts', record.contacts);
    appendRows('schedules', record.schedules);
    appendRows('vendorsTable', record.vendors);
    appendRows('ritualsTable', record.rituals);
    // Editing an existing case must preserve deleted vendor rows.
    // Default vendor items are only seeded when a brand-new case is created.
    fillDefaults({ seedVendors: false });
    refreshAutoGrowingTextarea(form.elements.notes);

    const dateSelectionBody = document.querySelector('#dateSelectionTable tbody');
    if (dateSelectionBody) {
      dateSelectionBody.innerHTML = '';
      (Array.isArray(record.dateSelections) ? record.dateSelections : [])
        .filter(item => item && [item.title, item.name, item.lunarBirth, item.solarBirth]
          .some(value => String(value || '').trim()))
        .forEach(item => window.__addDateSelection?.(item));
    }
    [...document.querySelectorAll('#schedules tbody tr.schedule-main-row')].forEach((row, index) => {
      row.dataset.lineOrdered = record.scheduleOrders?.[index] ? 'true' : 'false';
    });

    window.__closeAllAppViews();
    const dashboard = document.querySelector('.dashboard');
    const section = document.querySelector('.section');
    if (dashboard) dashboard.style.display = '';
    if (section) section.style.display = '';

    syncEditCaseTitle();

    document.querySelectorAll('.tabs button, .pane').forEach(element => element.classList.remove('active'));
    document.querySelector('.tabs button[data-tab="basic"]')?.classList.add('active');
    document.getElementById('basic')?.classList.add('active');

    document.querySelectorAll('.sidebar .nav button').forEach(button => {
      button.classList.toggle('active', !archiveSelection && button.id === 'newCaseButton');
    });
    archiveSelection?.classList.add('archive-active');

    window.prepareAllCaseDates?.();
    syncLunarDates();
    window.refreshBasicLunarDates?.();
    updateMetrics();
    window.__syncDateCaseSummary?.();
    window.__refreshLineOrderButton?.();
    const customSortToggle = document.getElementById('customSortToggle');
    if (customSortToggle) customSortToggle.hidden = false;
    window.setTimeout(() => {
      window.__syncDateCaseSummary?.();
      window.__refreshVenueLunarLabels?.();
      markCaseSaved();
    }, 0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  window.__openCaseForEdit = populateFormDirectly;

  const showError = error => {
    console.error('編輯案件失敗', error);
    const status = document.getElementById('status');
    if (!status) return;
    status.textContent = `開啟案件失敗：${error?.message || '未知錯誤'}`;
    status.style.background = '#9f2d2d';
    status.classList.add('show');
    window.setTimeout(() => status.classList.remove('show'), 3500);
  };

  /*
   * document 捕獲階段比列表與按鈕上的所有舊事件更早執行。
   * 完成後停止傳遞，確保舊事件不會再次覆蓋畫面。
   */
  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest('.case-list-view .case-list-row button:not(.delete-case):not(.export-case):not(.export-word-case)');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    try {
      const row = button.closest('.case-list-row');
      const record = row ? recordForRow(row) : null;
      if (!record) throw new Error('找不到這筆已儲存案件');
      populateFormDirectly(record);
    } catch (error) {
      showError(error);
    }
  }, true);

})();

;

(() => {
  const recordsKey = 'funeral-case-records-v1';

  const readRecords = () => {
    try {
      const records = JSON.parse(localStorage.getItem(recordsKey) || '[]');
      return Array.isArray(records) ? records : [];
    } catch {
      return [];
    }
  };

  const sortedRecords = () => [...readRecords()].sort((a, b) =>
    String(a?.fields?.case_no || '').localeCompare(String(b?.fields?.case_no || ''), 'zh-Hant', { numeric: true })
  );

  const recordForRow = row => {
    const caseNo = String(row?.dataset?.caseNo || '').trim();
    if (caseNo) {
      return readRecords().find(record =>
        String(record?.fields?.case_no || '').trim() === caseNo
      ) || null;
    }
    const rows = [...document.querySelectorAll('.case-list-view .case-list-row')];
    return sortedRecords()[rows.indexOf(row)] || null;
  };

  const showMessage = (text, isError = false) => {
    const status = document.getElementById('status');
    if (!status) return;
    status.textContent = text;
    status.style.background = isError ? '#9f2d2d' : '#163f3b';
    status.classList.add('show');
    window.setTimeout(() => status.classList.remove('show'), 2600);
  };

  const decorateRows = () => {
    document.querySelectorAll('.case-list-view .case-list-row').forEach(row => {
      const existingDeleteButton = row.querySelector('.delete-case');
      if (existingDeleteButton) {
        if (existingDeleteButton.textContent !== '刪除') {
          existingDeleteButton.textContent = '刪除';
        }
        return;
      }

      const editButton = row.querySelector('button');
      if (!editButton) return;

      let actions = editButton.closest('.case-list-row-actions');
      if (!actions) {
        actions = document.createElement('div');
        actions.className = 'case-list-row-actions';
        editButton.before(actions);
        actions.append(editButton);
      }

      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'btn delete-case';
      deleteButton.textContent = '刪除';
      actions.append(deleteButton);
    });
  };

  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest('.case-list-view .delete-case');
    if (!button) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const row = button.closest('.case-list-row');
    const record = row ? recordForRow(row) : null;
    if (!record) {
      showMessage('刪除失敗：找不到案件資料', true);
      return;
    }

    const caseNo = record.fields?.case_no || '';
    const caseName = record.fields?.case_name || '未命名案件';
    if (!window.confirm(`確定要刪除案件「${caseNo} ${caseName}」嗎？`)) return;

    try {
      const records = readRecords();
      const index = records.findIndex(item =>
        item === record ||
        (
          String(item?.fields?.case_no || '') === String(record?.fields?.case_no || '') &&
          String(item?.fields?.case_name || '') === String(record?.fields?.case_name || '')
        )
      );
      if (index < 0) throw new Error('找不到要刪除的案件');

      records.splice(index, 1);
      localStorage.setItem(recordsKey, JSON.stringify(records));
      document.dispatchEvent(new CustomEvent('funeral:case-deleted', {
        detail: { caseNo: String(caseNo).trim() }
      }));
      row.remove();

      const content = document.querySelector('.case-list-view .case-list-content');
      if (content && !content.querySelector('.case-list-row')) {
        content.innerHTML = '<p class="empty-list">目前尚未儲存任何案件。</p>';
      }
      showMessage('案件已刪除');
    } catch (error) {
      console.error('刪除案件失敗', error);
      showMessage(`刪除失敗：${error?.message || '未知錯誤'}`, true);
    }
  }, true);

  const observer = new MutationObserver(decorateRows);
  observer.observe(document.body, { childList: true, subtree: true });
  decorateRows();
})();

;

(() => {
  const religionField = document.querySelector('#basic [name="religion"]')?.closest('.field');
  if (religionField && !document.querySelector('#basic [name="case_type"]')) {
    const caseTypeField = document.createElement('div');
    caseTypeField.className = 'field case-type-equal-field';
    caseTypeField.innerHTML = `
      <label>方案類型</label>
      <input name="case_type" placeholder="例如：一般型">
    `;
    religionField.before(caseTypeField);
  }

  const caseTypeField = document.querySelector('#basic [name="case_type"]')?.closest('.field');
  const inspectionField = document.querySelector('#basic [name="inspection_unit"]')?.closest('.field');
  [caseTypeField, religionField, inspectionField].forEach(field => {
    field?.classList.add('case-type-equal-field');
  });

  const pickupField = document.querySelector('#basic [name="pickup_location"]')?.closest('.field');
  const altarField = document.querySelector('#basic [name="altar_location"]')?.closest('.field');
  if (pickupField && altarField && !pickupField.closest('.location-flow')) {
    const parent = pickupField.parentElement;
    if (parent && altarField.parentElement === parent) {
      const flow = document.createElement('div');
      flow.className = 'location-flow';
      parent.insertBefore(flow, pickupField);
      flow.append(pickupField, altarField);
    }
  }

  const ancestorChoice = document.querySelector(
    '#venue .aftercare-choice [name="ancestor_tablet"]'
  )?.closest('.choice-row') ||
  document.querySelector(
    '#venue .aftercare-choice .choice-row'
  );

  if (ancestorChoice && !ancestorChoice.querySelector('[name="ancestor_direction"]')) {
    const directionLabel = document.createElement('span');
    directionLabel.className = 'ancestor-direction-label';
    directionLabel.textContent = '方位';

    const direction = document.createElement('select');
    direction.name = 'ancestor_direction';
    direction.setAttribute('aria-label', '祖先牌位方位');
    direction.innerHTML = `
      <option value="">選擇</option>
      <option value="東">東</option>
      <option value="西">西</option>
      <option value="南">南</option>
      <option value="北">北</option>
    `;
    ancestorChoice.append(directionLabel, direction);
  }
})();

;

(() => {
  const dateNames = new Set(['hundred_days', 'anniversary']);

  const updateLunarLabel = input => {
    if (!input || !dateNames.has(input.name)) return;
    const field = input.closest('.field');
    const label = field?.querySelector(':scope > label');
    if (!label) return;

    const base = label.dataset.baseLabel ||
      label.textContent.replace(/（(?:農曆：|[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]年農)[^）]+）/g, '').trim();
    label.dataset.baseLabel = base;

    const value = input.value.trim();
    const completeDate = /^\d{3}\/\d{2}\/\d{2}$/.test(value);
    const nextLabel = completeDate
      ? `${base}（${lunarText(value.replaceAll('/', '-'))}）`
      : base;
    if (label.textContent !== nextLabel) label.textContent = nextLabel;

    field.querySelectorAll('.lunar-in-field, .lunar-note').forEach(note => note.remove());
  };

  const updateAll = () => {
    dateNames.forEach(name => {
      updateLunarLabel(document.querySelector(`#venue [name="${name}"]`));
    });
  };

  window.__refreshVenueLunarLabels = updateAll;

  document.getElementById('caseForm')?.addEventListener('input', event => {
    if (dateNames.has(event.target?.name)) {
      window.setTimeout(() => updateLunarLabel(event.target), 0);
    }
  }, true);

  document.getElementById('caseForm')?.addEventListener('change', event => {
    if (dateNames.has(event.target?.name)) {
      window.setTimeout(() => updateLunarLabel(event.target), 0);
    }
  }, true);

  const observer = new MutationObserver(updateAll);
  const venue = document.getElementById('venue');
  if (venue) observer.observe(venue, { childList: true, subtree: true });
  updateAll();
})();

;

(() => {
  const table = document.getElementById('vendorsTable');
  const body = table?.tBodies?.[0];
  const form = document.getElementById('caseForm');
  if (!table || !body || !form) return;

  let lineGroups = [];
  let groupsLoaded = false;

  const rowControls = row => ({
    item: row.querySelector('[name="vendor_item"]'),
    vendor: row.querySelector('[name="vendor_name"]'),
    note: row.querySelector('[name="vendor_note"]'),
    ordered: row.querySelector('[name="vendor_notified"]'),
    matched: row.querySelector('[name="vendor_confirmed"]'),
    group: row.querySelector('.vendor-line-group'),
    button: row.querySelector('.vendor-line-order')
  });

  const refreshButton = row => {
    const { button } = rowControls(row);
    if (!button) return;
    const complete = row.dataset.vendorLineOrdered === 'true';
    button.classList.toggle('vendor-line-complete', complete);
    button.textContent = complete ? '已下單' : '自動下單';
    button.disabled = complete;
  };

  const populateGroupSelect = select => {
    if (!select) return;
    const row = select.closest('tr');
    const selected = select.value || row?.dataset.vendorLineGroup || '';
    select.replaceChildren();

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = groupsLoaded
      ? (lineGroups.length ? '選擇群組' : '尚無可用群組')
      : '載入群組中…';
    select.append(placeholder);

    lineGroups.forEach(group => {
      const option = document.createElement('option');
      option.value = String(group.group_id || '');
      option.textContent = String(group.group_name || 'LINE 群組');
      select.append(option);
    });

    if (selected && !lineGroups.some(group => String(group.group_id) === selected)) {
      const unavailable = document.createElement('option');
      unavailable.value = selected;
      unavailable.textContent = '原選擇群組（目前不可用）';
      select.append(unavailable);
    }
    select.value = selected;
  };

  const prepareRows = () => {
    [...body.rows].forEach(row => {
      const { group } = rowControls(row);
      populateGroupSelect(group);
      refreshButton(row);
    });
  };

  const loadGroups = async () => {
    const cloud = window.funeralCloud?.client;
    const companyId = window.funeralCloud?.companyId;
    if (!cloud || !companyId) {
      groupsLoaded = true;
      lineGroups = [];
      prepareRows();
      return;
    }
    const { data, error } = await cloud.from('line_groups')
      .select('group_id, group_name')
      .eq('company_id', companyId)
      .eq('active', true)
      .order('bound_at', { ascending: true });
    groupsLoaded = true;
    lineGroups = error || !Array.isArray(data) ? [] : data;
    prepareRows();
  };

  new MutationObserver(records => {
    if (records.some(record => record.addedNodes.length)) prepareRows();
  }).observe(body, { childList: true });

  table.addEventListener('change', event => {
    const select = event.target.closest('.vendor-line-group');
    if (!select) return;
    const row = select.closest('tr');
    if (!row) return;
    row.dataset.vendorLineGroup = select.value;
    row.dataset.vendorLineOrdered = 'false';
    refreshButton(row);
  });

  table.addEventListener('input', event => {
    if (!event.target.matches('[name="vendor_item"], [name="vendor_name"], [name="vendor_note"]')) return;
    const row = event.target.closest('tr');
    if (!row || row.dataset.vendorLineOrdered !== 'true') return;
    row.dataset.vendorLineOrdered = 'false';
    const ordered = row.querySelector('[name="vendor_notified"]');
    if (ordered) ordered.checked = false;
    refreshButton(row);
  });

  table.addEventListener('click', async event => {
    const button = event.target.closest('.vendor-line-order');
    if (!button) return;
    const row = button.closest('tr');
    if (!row) return;
    const controls = rowControls(row);
    const groupId = String(controls.group?.value || '').trim();
    const item = String(controls.item?.value || '').trim();
    if (!item) {
      window.alert('請先填寫廠商項目。');
      controls.item?.focus();
      return;
    }
    if (!groupId) {
      window.alert('請先選擇要傳送的 LINE 群組。');
      controls.group?.focus();
      return;
    }
    if (!window.funeralCloud?.sendLineOrder) {
      window.alert('LINE 自動下單尚未完成設定。');
      return;
    }

    const caseData = window.collect?.() || {};
    const vendorOrder = {
      item,
      vendor: String(controls.vendor?.value || '').trim(),
      note: String(controls.note?.value || '').trim()
    };
    button.disabled = true;
    button.textContent = '下單中…';
    try {
      const result = await window.funeralCloud.sendLineOrder({
         event: 'funeral_vendor_auto_order',
         sent_at: new Date().toISOString(),
         case_no: caseData.fields?.case_no || '',
         case_name: caseData.fields?.case_name || '',
         date: caseData.fields?.funeral_date || '',
         time: '',
         location: caseData.fields?.ceremony_location || '',
         people: '',
         note: vendorOrder.note,
         line_group_id: groupId,
         vendors: [vendorOrder]
       });
      row.dataset.vendorLineGroup = groupId;
      row.dataset.vendorLineOrdered = 'true';
      if (controls.ordered) {
        controls.ordered.checked = true;
        controls.ordered.dispatchEvent(new Event('change', { bubbles: true }));
      }
      refreshButton(row);
      window.save?.();
      window.flash?.(`已由 LINE 官方帳號送出到 ${result.sent || 1} 個群組。`);
    } catch (error) {
      row.dataset.vendorLineOrdered = 'false';
      button.disabled = false;
      button.textContent = '自動下單';
      window.alert(`自動下單失敗：${error.message}`);
    }
  });

  window.addEventListener('funeral-cloud-ready', loadGroups);
  window.setTimeout(loadGroups, 700);
  prepareRows();
})();

;

(() => {
  const navigation = document.querySelector('.sidebar .nav');
  if (!navigation) return;

  const activateOnly = selected => {
    navigation.querySelectorAll('button').forEach(button => {
      button.classList.toggle('active', button === selected);
    });
  };

  navigation.addEventListener('click', event => {
    const selected = event.target.closest('button');
    if (!selected || !navigation.contains(selected)) return;

    activateOnly(selected);
    window.setTimeout(() => activateOnly(selected), 0);
    window.requestAnimationFrame(() => activateOnly(selected));
  }, true);
})();

;

(() => {
  const navigation = document.querySelector('.sidebar .nav');
  const main = document.querySelector('main.main');
  const listButton = [...(navigation?.querySelectorAll('button') || [])]
    .find(button => button.textContent.includes('案件列表'));
  if (!navigation || !main || !listButton) return;

  document.querySelector('.case-overview-view .overview-cards .card:nth-child(4)')?.remove();

  const searchButton = document.createElement('button');
  searchButton.type = 'button';
  searchButton.className = 'case-search-nav';
  searchButton.innerHTML = '⌕　案件搜尋';
  listButton.after(searchButton);

  const searchView = document.createElement('section');
  searchView.className = 'case-search-view';
  searchView.innerHTML = `
    <h1>案件搜尋</h1>
    <div class="case-search-panel">
      <label for="caseSearchInput"><strong>搜尋案件</strong></label>
      <input id="caseSearchInput" class="case-search-input"
        placeholder="輸入案件編號、案名、日期、聯絡人或電話">
      <div class="case-search-results">
        <p class="empty-list">請輸入關鍵字搜尋案件。</p>
      </div>
    </div>
  `;
  main.append(searchView);

  const input = searchView.querySelector('#caseSearchInput');
  const results = searchView.querySelector('.case-search-results');
  const recordsKey = 'funeral-case-records-v1';
  let matches = [];

  const readRecords = () => {
    try {
      const records = JSON.parse(localStorage.getItem(recordsKey) || '[]');
      return Array.isArray(records) ? records : [];
    } catch {
      return [];
    }
  };

  const searchableText = record => {
    const fields = Object.values(record?.fields || {});
    const contacts = (record?.contacts || []).flatMap(contact => Object.values(contact || {}));
    return [...fields, ...contacts].join(' ').toLowerCase();
  };

  const renderResults = () => {
    const keyword = input.value.trim().toLowerCase();
    if (!keyword) {
      matches = [];
      results.innerHTML = '<p class="empty-list">請輸入關鍵字搜尋案件。</p>';
      return;
    }

    matches = readRecords().filter(record => searchableText(record).includes(keyword));
    if (!matches.length) {
      results.innerHTML = '<p class="empty-list">找不到符合條件的案件。</p>';
      return;
    }

    results.innerHTML = '';
    matches.forEach((record, index) => {
      const row = document.createElement('div');
      row.className = 'case-search-result';
      const number = record.fields?.case_no || '';
      const name = record.fields?.case_name || '未命名案件';
      const date = record.fields?.funeral_date || '未填寫出殯日期';
      row.innerHTML = `
        <div>
          <strong>${number}　${name}</strong>
          <span>出殯日期：${date}</span>
        </div>
        <button type="button" class="btn" data-search-index="${index}">開啟案件</button>
      `;
      results.append(row);
    });
  };

  searchButton.addEventListener('click', () => {
    window.__closeAllAppViews();
    searchView.classList.add('active');
    document.querySelector('.top')?.style.setProperty('display', 'none');
    searchButton.classList.add('active');
    input.focus();
    renderResults();
  });

  input.addEventListener('input', renderResults);

  results.addEventListener('click', event => {
    const button = event.target.closest('[data-search-index]');
    if (!button) return;
    const record = matches[Number(button.dataset.searchIndex)];
    if (!record) return;

    listButton.click();
    window.setTimeout(() => {
      const records = readRecords().sort((a, b) =>
        String(a?.fields?.case_no || '').localeCompare(String(b?.fields?.case_no || ''), 'zh-Hant', { numeric: true })
      );
      const index = records.findIndex(item =>
        String(item?.fields?.case_no || '') === String(record?.fields?.case_no || '') &&
        String(item?.fields?.case_name || '') === String(record?.fields?.case_name || '')
      );
      const row = document.querySelectorAll('.case-list-view .case-list-row')[index];
      row?.querySelector('button:not(.delete-case)')?.click();
    }, 30);
  });
})();

;

(() => {
  const content = document.querySelector('.case-list-view .case-list-content');
  if (!content) return;
  const recordsKey = 'funeral-case-records-v1';

  const sortedRecords = () => {
    try {
      const records = JSON.parse(localStorage.getItem(recordsKey) || '[]');
      return (Array.isArray(records) ? records : []).sort((a, b) =>
        String(a?.fields?.case_no || '').localeCompare(String(b?.fields?.case_no || ''), 'zh-Hant', { numeric: true })
      );
    } catch {
      return [];
    }
  };

  const makeCell = value => {
    const cell = document.createElement('span');
    cell.textContent = value || '—';
    return cell;
  };

  const enhanceList = () => {
    if (!content.querySelector('.case-list-column-header')) {
      const header = document.createElement('div');
      header.className = 'case-list-column-header';
      ['案件編號', '案名', '來源', '方案類型', '地區'].forEach(text => {
        header.append(makeCell(text));
      });
      content.prepend(header);
    }

    const records = sortedRecords();
    content.querySelectorAll('.case-list-row').forEach((row, index) => {
      if (row.querySelector('.case-list-data-grid')) return;
      const record = records[index] || {};
      const fields = record.fields || {};
      row.dataset.caseNo = String(fields.case_no || '');
      const oldDetails = [...row.children].find(child =>
        child.tagName === 'DIV' && !child.classList.contains('case-list-row-actions')
      );

      const grid = document.createElement('div');
      grid.className = 'case-list-data-grid';
      grid.append(
        makeCell(fields.case_no),
        makeCell(fields.case_name),
        makeCell(fields.source),
        makeCell(fields.case_type),
        makeCell(String(fields.address || '').slice(0, 3))
      );

      if (oldDetails) oldDetails.replaceWith(grid);
      else row.prepend(grid);
    });
  };

  const observer = new MutationObserver(enhanceList);
  observer.observe(content, { childList: true, subtree: false });

  [...document.querySelectorAll('.sidebar .nav > button')]
    .find(button => (button.textContent || '').includes('案件列表'))
    ?.addEventListener('click', () => window.setTimeout(enhanceList, 0));
  enhanceList();
})();

;

(() => {
  document.querySelectorAll('.sidebar .nav button').forEach(button => {
    const text = button.textContent;
    if (text.includes('行事曆') || text.includes('廠商管理')) button.remove();
  });
})();

;

(() => {
  const recordsKey = 'funeral-case-records-v1';

  const readRecords = () => {
    try {
      const records = JSON.parse(localStorage.getItem(recordsKey) || '[]');
      return Array.isArray(records) ? records : [];
    } catch {
      return [];
    }
  };

  const sortedRecords = () => readRecords().sort((a, b) =>
    String(a?.fields?.case_no || '').localeCompare(String(b?.fields?.case_no || ''), 'zh-Hant', { numeric: true })
  );

  const recordForRow = row => {
    const caseNo = String(row?.dataset?.caseNo || '').trim();
    if (caseNo) return readRecords().find(record => String(record?.fields?.case_no || '').trim() === caseNo) || null;
    const rows = [...document.querySelectorAll('.case-list-view .case-list-row')];
    return sortedRecords()[rows.indexOf(row)] || null;
  };

  const escapeHtml = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const fieldLabel = name => {
    try {
      const control = document.querySelector(`#caseForm [name="${CSS.escape(name)}"]`);
      return control?.closest('.field')?.querySelector(':scope > label')?.textContent
        ?.replace(/（(?:農曆：|[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]年農)[^）]+）/g, '').trim() || name;
    } catch {
      return name;
    }
  };

  const fieldRows = record => Object.entries(record?.fields || {})
    .filter(([, value]) => value !== '' && value !== false && value != null)
    .map(([name, value]) => `
      <tr>
        <th>${escapeHtml(fieldLabel(name))}</th>
        <td>${escapeHtml(value === true ? '是' : value)}</td>
      </tr>
    `).join('');

  const table = (title, headers, rows) => {
    if (!rows.length) return '';
    return `
      <section>
        <h2>${escapeHtml(title)}</h2>
        <table>
          <thead><tr>${headers.map(header => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>
          <tbody>${rows.map(row => `<tr>${row.map(value => `<td>${escapeHtml(value)}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>
      </section>
    `;
  };

  const exportRecord = record => {
    const caseName = record?.fields?.case_name || '未命名案件';
    const safeName = `${caseName}服務履歷`.replace(/[\\/:*?"<>|]/g, '_');
    const contacts = (record.contacts || [])
      .filter(item => item.name || item.relation || item.phone)
      .map(item => [item.name || '', item.relation || '', item.phone || '']);
    const schedules = (record.schedules || [])
      .filter(item => item.item || item.date || item.time || item.people || item.note)
      .map(item => [item.item || '', item.date || '', item.time || '', item.people || '', item.note || '']);
    const vendors = (record.vendors || [])
      .filter(item => item.item || item.vendor || item.note || item.notified || item.confirmed)
      .map(item => [
        item.item || '', item.vendor || '', item.note || '',
        item.notified ? '是' : '否', item.confirmed ? '是' : '否'
      ]);

    const printWindow = window.open('', '_blank', 'width=980,height=760');
    if (!printWindow) {
      window.alert('瀏覽器阻擋了匯出視窗，請允許此頁面開啟彈出式視窗。');
      return;
    }

    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
      <html lang="zh-Hant">
      <head>
        <meta charset="utf-8">
        <title>${escapeHtml(safeName)}</title>
        <style>
          @page { size: A4; margin: 14mm; }
          body { color:#17212b; font-family:"Microsoft JhengHei","Noto Sans TC",sans-serif; }
          h1 { margin:0 0 6px; font-size:24px; }
          .subtitle { color:#64748b; margin-bottom:20px; }
          h2 { margin:22px 0 8px; font-size:17px; color:#115d54; }
          table { width:100%; border-collapse:collapse; margin-bottom:12px; }
          th, td { border:1px solid #cbd5e1; padding:7px 9px; text-align:left; vertical-align:top; font-size:12px; }
          th { background:#f3f7f7; font-weight:700; }
          tbody th { width:25%; }
          .print-toolbar { position:sticky; top:0; display:flex; justify-content:flex-end; padding:10px 0; background:#fff; }
          .print-button { border:0; border-radius:7px; padding:10px 16px; color:#fff; background:#2563eb; font:700 15px "Microsoft JhengHei",sans-serif; cursor:pointer; }
          @media print { .print-note, .print-toolbar { display:none; } }
        </style>
      </head>
      <body>
        <div class="print-toolbar">
          <button type="button" class="print-button" onclick="window.print()">列印／另存 PDF</button>
        </div>
        <h1>${escapeHtml(caseName)}服務履歷</h1>
        <div class="subtitle">案件編號：${escapeHtml(record.fields?.case_no || '未填寫')}</div>
        <section>
          <h2>案件資料</h2>
          <table><tbody>${fieldRows(record)}</tbody></table>
        </section>
        ${table('聯絡人', ['姓名', '關係', '電話'], contacts)}
        ${table('法事排程', ['項目', '日期', '時間', '人數', '備註'], schedules)}
        ${table('廠商確認', ['項目', '廠商名', '備註', '已下單', '已對單'], vendors)}
        <p class="print-note">請在列印視窗中選擇「另存為 PDF」。</p>
        <script>
          window.addEventListener('load', () => {
            window.setTimeout(() => window.print(), 150);
          });
        <\/script>
      </body>
      </html>`);
    printWindow.document.close();
  };

  const downloadRecordPdf = record => {
    const caseName = record?.fields?.case_name || '未命名案件';
    const safeName = `${caseName}服務履歷`.replace(/[\\/:*?"<>|]/g, '_');
    const reportItems = [];

    const addSection = title => reportItems.push({ type: 'section', text: title });
    const addEntry = (label, value, span = 1) => {
      reportItems.push({
        type: 'entry',
        label,
        span: Math.max(1, Math.min(3, span)),
        value:
          value === true ? '是' :
          value === false ? '否' :
          value === '' || value == null ? '' :
          value
      });
    };

    const savedFields = record?.fields || {};
    const exportedNames = new Set();
    const paneDefinitions = [
      ['basic', '基本資料'],
      ['arrangement', '禮儀安排'],
      ['ceremony', '功德法事'],
      ['venue', '後續關懷']
    ];

    paneDefinitions.forEach(([paneId, title]) => {
      const pane = document.getElementById(paneId);
      if (!pane) return;
      const controls = [...pane.querySelectorAll('input[name], select[name], textarea[name]')]
        .filter(control => control.type !== 'file' && !control.closest('tbody'));
      const controlsByName = new Map();
      controls.forEach(control => {
        if (!controlsByName.has(control.name)) controlsByName.set(control.name, control);
      });
      if (!controlsByName.size) return;

      addSection(title);
      controlsByName.forEach((control, name) => {
        exportedNames.add(name);
        const field = control.closest('.field');
        const span = field?.classList.contains('full') ? 3 :
          field?.classList.contains('wide') ? 2 : 1;
        addEntry(fieldLabel(name), savedFields[name], span);
      });
    });

    const remainingFields = Object.keys(savedFields).filter(name => !exportedNames.has(name));
    if (remainingFields.length) {
      addSection('其他案件資料');
      remainingFields.forEach(name => addEntry(fieldLabel(name), savedFields[name]));
    }

    const contacts = (record.contacts || []).filter(item =>
      item.name || item.relation || item.phone
    );
    if (contacts.length) {
      addSection('聯絡人');
      contacts.forEach((item, index) => {
        addEntry(`聯絡人 ${index + 1}`, [item.name, item.relation, item.phone].filter(Boolean).join('／'));
      });
    }

    const schedules = (record.schedules || []).filter(item =>
      item.item || item.date || item.time || item.people || item.note
    );
    if (schedules.length) {
      addSection('法事排程');
      schedules.forEach(item => {
        addEntry(
          item.item || '法事項目',
          [item.date, item.time, item.people ? `${item.people}人` : '', item.note]
            .filter(Boolean).join('／')
        );
      });
    }

    const vendors = (record.vendors || []).filter(item =>
      item.item || item.vendor || item.note || item.notified || item.confirmed
    );
    if (vendors.length) {
      addSection('廠商確認單');
      vendors.forEach(item => {
        addEntry(
          item.item || '廠商項目',
          [
            item.vendor,
            item.note,
            item.notified ? '已下單' : '',
            item.confirmed ? '已對單' : ''
          ].filter(Boolean).join('／') || '尚未填寫'
        );
      });
    }

    // 1240 × 1754 約為 A4 150 DPI；輸出時放大 2 倍成為約 300 DPI。
    const pageWidth = 1240;
    const pageHeight = 1754;
    const outputScale = 2;
    const margin = 86;
    const contentWidth = pageWidth - margin * 2;
    const pages = [];
    let canvas;
    let context;
    let y;

    const newPage = first => {
      canvas = document.createElement('canvas');
      canvas.width = pageWidth * outputScale;
      canvas.height = pageHeight * outputScale;
      context = canvas.getContext('2d');
      context.scale(outputScale, outputScale);
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, pageWidth, pageHeight);
      context.fillStyle = '#17212b';
      context.textBaseline = 'top';
      y = margin;
      if (first) {
        context.font = 'bold 42px "Microsoft JhengHei", sans-serif';
        context.fillText(`${caseName}服務履歷`, margin, y);
        y += 62;
        context.fillStyle = '#64748b';
        context.font = '24px "Microsoft JhengHei", sans-serif';
        context.fillText(`案件編號：${record.fields?.case_no || '未填寫'}`, margin, y);
        context.fillStyle = '#17212b';
        y += 58;
      }
      pages.push(canvas);
    };

    const wrapText = (text, font, maxWidth) => {
      context.font = font;
      const characters = [...String(text)];
      const lines = [];
      let line = '';
      characters.forEach(character => {
        const next = line + character;
        if (line && context.measureText(next).width > maxWidth) {
          lines.push(line);
          line = character;
        } else {
          line = next;
        }
      });
      if (line) lines.push(line);
      return lines.length ? lines : [''];
    };

    const ensureSpace = required => {
      if (y + required <= pageHeight - margin) return;
      newPage(false);
    };

    newPage(true);
    let entryBuffer = [];

    const drawEntryBuffer = () => {
      const columns = 3;
      const gap = 16;
      const columnWidth = (contentWidth - gap * (columns - 1)) / columns;
      const rows = [];
      let currentRow = [];
      let usedColumns = 0;
      entryBuffer.forEach(item => {
        const span = item.span || 1;
        if (currentRow.length && usedColumns + span > columns) {
          rows.push(currentRow);
          currentRow = [];
          usedColumns = 0;
        }
        currentRow.push({ ...item, startColumn: usedColumns });
        usedColumns += span;
        if (usedColumns === columns) {
          rows.push(currentRow);
          currentRow = [];
          usedColumns = 0;
        }
      });
      if (currentRow.length) rows.push(currentRow);

      rows.forEach(row => {
        const prepared = row.map(item => {
          const itemWidth = columnWidth * item.span + gap * (item.span - 1);
          const labelLines = wrapText(
            item.label,
            'bold 19px "Microsoft JhengHei", sans-serif',
            itemWidth - 24
          );
          const valueLines = wrapText(
            String(item.value ?? ''),
            '21px "Microsoft JhengHei", sans-serif',
            itemWidth - 24
          );
          return { item, itemWidth, labelLines, valueLines };
        });
        const labelHeight = Math.max(...prepared.map(item => item.labelLines.length * 25));
        const valueHeight = Math.max(52, ...prepared.map(item => item.valueLines.length * 30 + 18));
        const rowHeight = labelHeight + 8 + valueHeight;
        ensureSpace(rowHeight + 12);

        prepared.forEach(item => {
          const x = margin + item.item.startColumn * (columnWidth + gap);
          const itemWidth = item.itemWidth;
          let textY = y;
          context.fillStyle = '#334155';
          context.font = 'bold 19px "Microsoft JhengHei", sans-serif';
          item.labelLines.forEach(line => {
            context.fillText(line, x + 3, textY);
            textY += 25;
          });

          const boxY = y + labelHeight + 8;
          context.beginPath();
          if (typeof context.roundRect === 'function') {
            context.roundRect(x, boxY, itemWidth, valueHeight, 9);
          } else {
            context.rect(x, boxY, itemWidth, valueHeight);
          }
          context.fillStyle = '#ffffff';
          context.fill();
          context.strokeStyle = '#cbd5e1';
          context.lineWidth = 1.4;
          context.stroke();

          context.fillStyle = '#17212b';
          context.font = '21px "Microsoft JhengHei", sans-serif';
          textY = boxY + 12;
          item.valueLines.forEach(line => {
            context.fillText(line, x + 12, textY);
            textY += 30;
          });
        });
        y += rowHeight + 18;
      });
      entryBuffer = [];
    };

    reportItems.forEach(item => {
      if (item.type === 'section') {
        drawEntryBuffer();
        ensureSpace(66);
        y += 18;
        context.fillStyle = '#197a6e';
        context.fillRect(margin, y, 7, 31);
        context.fillStyle = '#115d54';
        context.font = 'bold 29px "Microsoft JhengHei", sans-serif';
        context.fillText(item.text, margin + 18, y - 1);
        y += 47;
        context.strokeStyle = '#cbd5e1';
        context.beginPath();
        context.moveTo(margin, y - 5);
        context.lineTo(pageWidth - margin, y - 5);
        context.stroke();
        return;
      }
      entryBuffer.push(item);
    });
    drawEntryBuffer();

    const encoder = new TextEncoder();
    const encode = text => encoder.encode(text);
    const concat = arrays => {
      const length = arrays.reduce((sum, array) => sum + array.length, 0);
      const result = new Uint8Array(length);
      let position = 0;
      arrays.forEach(array => {
        result.set(array, position);
        position += array.length;
      });
      return result;
    };
    const jpegBytes = pages.map(page => {
      const base64 = page.toDataURL('image/jpeg', 0.9).split(',')[1];
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }
      return bytes;
    });

    const objectCount = 2 + pages.length * 3;
    const objects = new Array(objectCount + 1);
    const pageReferences = [];
    jpegBytes.forEach((image, index) => {
      const pageObject = 3 + index * 3;
      const imageObject = pageObject + 1;
      const contentObject = pageObject + 2;
      pageReferences.push(`${pageObject} 0 R`);
      objects[pageObject] = encode(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] ` +
        `/Resources << /XObject << /Im0 ${imageObject} 0 R >> >> ` +
        `/Contents ${contentObject} 0 R >>`
      );
      objects[imageObject] = concat([
        encode(
          `<< /Type /XObject /Subtype /Image /Width ${pages[index].width} /Height ${pages[index].height} ` +
          `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.length} >>\nstream\n`
        ),
        image,
        encode('\nendstream')
      ]);
      const drawing = encode('q 595.28 0 0 841.89 0 0 cm /Im0 Do Q');
      objects[contentObject] = concat([
        encode(`<< /Length ${drawing.length} >>\nstream\n`),
        drawing,
        encode('\nendstream')
      ]);
    });
    objects[1] = encode('<< /Type /Catalog /Pages 2 0 R >>');
    objects[2] = encode(
      `<< /Type /Pages /Kids [${pageReferences.join(' ')}] /Count ${pages.length} >>`
    );

    const pdfParts = [encode('%PDF-1.4\n')];
    const offsets = new Array(objectCount + 1).fill(0);
    let offset = pdfParts[0].length;
    for (let number = 1; number <= objectCount; number += 1) {
      const objectBytes = concat([
        encode(`${number} 0 obj\n`),
        objects[number],
        encode('\nendobj\n')
      ]);
      offsets[number] = offset;
      pdfParts.push(objectBytes);
      offset += objectBytes.length;
    }

    const xrefOffset = offset;
    let xref = `xref\n0 ${objectCount + 1}\n0000000000 65535 f \n`;
    for (let number = 1; number <= objectCount; number += 1) {
      xref += `${String(offsets[number]).padStart(10, '0')} 00000 n \n`;
    }
    xref +=
      `trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\n` +
      `startxref\n${xrefOffset}\n%%EOF`;
    pdfParts.push(encode(xref));

    const blob = new Blob(pdfParts, { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeName}.pdf`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 3000);
  };
  window.__downloadCasePdf = downloadRecordPdf;

  const wordValue = value => {
    if (Array.isArray(value)) return value.filter(Boolean).join('、');
    if (value === true) return '是';
    if (value === false || value == null) return '';
    return String(value);
  };

  const wordChoice = (selected, value, label = value) =>
    `${String(selected || '') === value ? '☑' : '□'}${label}`;

  const buildWordTemplateData = record => {
    const fields = record?.fields || {};
    const data = {};
    Object.entries(fields).forEach(([name, value]) => {
      data[name] = wordValue(value);
    });

    const value = name => wordValue(fields[name]);
    const contacts = Array.isArray(record?.contacts) ? record.contacts : [];
    const schedules = Array.isArray(record?.schedules) ? record.schedules : [];
    const vendors = (Array.isArray(record?.vendors) ? record.vendors : [])
      .filter(item => item?.item || item?.vendor || item?.note);
    const rituals = (Array.isArray(record?.rituals) ? record.rituals : [])
      .filter(item => item?.item || item?.vendor || item?.people || item?.note);

    data.case_no_summary = `案件編號：${value('case_no')}`;
    data.address_phone = [
      value('address'),
      value('phone') ? `電話：${value('phone')}` : ''
    ].filter(Boolean).join('　');
    data.vendor_header = [
      `亡者姓名：${value('case_name')}`,
      `出殯日期：${value('funeral_date')}`,
      `出殯地點：${value('ceremony_location') || value('altar_location')}`
    ].join('　');

    for (let index = 0; index < 3; index += 1) {
      const slot = index + 1;
      const contact = contacts[index] || {};
      data[`contact_${slot}_name`] = wordValue(contact.name);
      data[`contact_${slot}_relation`] = wordValue(contact.relation);
      data[`contact_${slot}_phone`] = wordValue(contact.phone);
    }

    data.nailing_summary = `${wordChoice(fields.nailing, '有')}　${wordChoice(fields.nailing, '無')}`;
    data.maternal_summary = `${wordChoice(fields.maternal, '有')}　${wordChoice(fields.maternal, '無')}`;
    data.farewell_rite_summary = `${wordChoice(fields.farewell_rite, '有')}　${wordChoice(fields.farewell_rite, '無')}`;
    data.coffin_rite_summary = `${wordChoice(fields.coffin_rite, '有')}　${wordChoice(fields.coffin_rite, '無')}`;
    data.coffin_tap_summary = `${wordChoice(fields.coffin_tap, '有')}　${wordChoice(fields.coffin_tap, '無')}`;
    data.mourning_traditional = wordChoice(fields.mourning_dress, '傳統');
    data.mourning_black = wordChoice(fields.mourning_dress, '黑袍');
    data.band_traditional = `${wordChoice(fields.band, '國樂')}　${value('band_people') ? `${value('band_people')}人` : ''}`;
    data.band_western = `${wordChoice(fields.band, '西樂')}　${value('band_people') ? `${value('band_people')}人` : ''}`;
    data.hearse_chinese = wordChoice(fields.hearse, '中式');
    data.hearse_western = wordChoice(fields.hearse, '西式');
    data.food_summary = [
      `${fields.food_restaurant ? '☑' : '□'}餐廳`,
      `${fields.food_box ? '☑' : '□'}餐盒`,
      `${fields.food_cash ? '☑' : '□'}紅包`,
      value('food_note')
    ].filter(Boolean).join('　');
    data.offering_summary = `功德法事（供品 ${fields.offering_meat ? '☑' : '□'}葷　${fields.offering_veg ? '☑' : '□'}素　${fields.offering_own ? '☑' : '□'}自備）`;
    data.body_care_summary = `${wordChoice(fields.body_care, '一般')}　${wordChoice(fields.body_care, '遺體SPA', '遺體SPA')}`;
    data.shroud_summary = `${wordChoice(fields.shroud, '自備')}　${wordChoice(fields.shroud, '公司')}`;
    data.outside_board_summary = [
      '館外接板',
      wordChoice(fields.outside_board, '有'),
      wordChoice(fields.outside_board, '無'),
      `${fields.family_ceremony ? '☑' : '□'}家奠`,
      `${fields.public_ceremony ? '☑' : '□'}公奠`,
      `${fields.open_incense ? '☑' : '□'}自由拈香`,
      `${fields.flower_blessing ? '☑' : '□'}獻花祝福`,
      `${fields.memorial_service ? '☑' : '□'}安息禮拜`
    ].join('　');
    data.staff_summary = `男：${value('staff_male')}　長孫：${value('staff_eldest_grandson')}`;
    data.procession_summary = `陣頭：${value('procession')}`;

    for (let index = 0; index < 8; index += 1) {
      const slot = String(index + 1).padStart(2, '0');
      const schedule = schedules[index] || {};
      data[`schedule_${slot}_item`] = wordValue(schedule.item);
      data[`schedule_${slot}_detail`] = [
        wordValue(schedule.date),
        wordValue(schedule.time),
        schedule.people ? `${wordValue(schedule.people)}人` : '',
        wordValue(schedule.note),
        wordValue(schedule.remark)
      ].filter(Boolean).join('　');
    }

    const normalizeVendorItem = item => String(item || '').replace(/\s+/g, '');
    const usedVendorIndexes = new Set();
    const takeVendor = aliases => {
      const normalizedAliases = aliases.map(normalizeVendorItem);
      const index = vendors.findIndex((vendor, vendorIndex) =>
        !usedVendorIndexes.has(vendorIndex) &&
        normalizedAliases.includes(normalizeVendorItem(vendor.item))
      );
      if (index < 0) return {};
      usedVendorIndexes.add(index);
      return vendors[index];
    };
    const leftVendorSlots = [
      ['接體', '接體車'], ['冰箱'], ['靈堂', '豎靈台'], ['棚架'], ['花山'], ['椅套'],
      ['擇日', '擇日師'], ['棺木'], ['骨罐'], ['協助驗屍'], ['洗穿化殮'], ['壽衣']
    ];
    const rightVendorSlots = [
      ['司儀'], ['禮生'], ['樂隊'], ['扶棺人員'], ['靈車'], ['供品'],
      ['素菜'], ['交通車'], ['紙紮'], ['庫錢'], ['投影設備'], []
    ];
    const fillVendorSlot = (side, index, vendor) => {
      const slot = String(index + 1).padStart(2, '0');
      data[`vendor_${side}_${slot}_name`] = wordValue(vendor.vendor);
      data[`vendor_${side}_${slot}_note`] = wordValue(vendor.note);
    };
    leftVendorSlots.forEach((aliases, index) => fillVendorSlot('left', index, takeVendor(aliases)));
    rightVendorSlots.forEach((aliases, index) => fillVendorSlot('right', index, aliases.length ? takeVendor(aliases) : {}));

    const extraVendors = vendors.filter((vendor, index) => !usedVendorIndexes.has(index));
    const fillExtraVendor = (side, index, vendor = {}) => {
      const slot = String(index + 1).padStart(2, '0');
      data[`vendor_extra_${side}_${slot}_item`] = wordValue(vendor.item);
      data[`vendor_extra_${side}_${slot}_name`] = wordValue(vendor.vendor);
      data[`vendor_extra_${side}_${slot}_note`] = wordValue(vendor.note);
    };
    for (let index = 0; index < 5; index += 1) {
      fillExtraVendor('left', index, extraVendors[index]);
      fillExtraVendor('right', index, extraVendors[index + 5]);
    }

    for (let index = 0; index < 9; index += 1) {
      const slot = String(index + 1).padStart(2, '0');
      const ritual = rituals[index] || {};
      data[`ritual_${slot}_item`] = wordValue(ritual.item);
      data[`ritual_${slot}_vendor`] = wordValue(ritual.vendor);
      data[`ritual_${slot}_people`] = wordValue(ritual.people);
      data[`ritual_${slot}_note`] = wordValue(ritual.note);
    }

    data.birth_summary = `生：${value('birth_date')}`;
    data.death_summary = `歿：${value('death_date')}`;
    data.home_summary = `自宅：${value('address')}`;
    data.hundred_days_summary = `百日：${value('hundred_days')}`;
    data.anniversary_summary = `對年：${value('anniversary')}`;
    data.ancestor_tablet_summary = `祖先牌位：${value('ancestor_tablet')}`;
    data.ancestor_tower_summary = `祖塔：${value('ancestor_tower')}`;
    data.tower_slot_summary = `塔位：${value('tower_slot')}`;

    return data;
  };

  const downloadRecordWord = record => {
    const Docxtemplater = window.docxtemplater || window.Docxtemplater;
    document.body.dataset.wordExportStatus = 'starting';
    delete document.body.dataset.wordExportBytes;
    delete document.body.dataset.wordExportName;
    if (!window.PizZip || !Docxtemplater || !window.CASE_WORD_TEMPLATE_BASE64) {
      document.body.dataset.wordExportStatus = 'missing-dependency';
      window.alert('Word 匯出元件尚未載入完成，請確認網路連線後重新整理頁面。');
      return;
    }
    try {
      const binary = window.atob(window.CASE_WORD_TEMPLATE_BASE64);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
      const zip = new window.PizZip(bytes);
      const documentTemplate = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: '{{', end: '}}' }
      });
      documentTemplate.render(buildWordTemplateData(record));
      const blob = typeof documentTemplate.toBlob === 'function'
        ? documentTemplate.toBlob()
        : documentTemplate.getZip().generate({
            type: 'blob',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          });
      const caseName = String(record?.fields?.case_name || '案件').trim() || '案件';
      const safeName = `${caseName}－協調事項`.replace(/[\\/:*?"<>|]/g, '_');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${safeName}.docx`;
      document.body.append(link);
      link.click();
      link.remove();
      document.body.dataset.wordExportStatus = 'success';
      document.body.dataset.wordExportBytes = String(blob.size);
      document.body.dataset.wordExportName = link.download;
      window.flash?.('Word 檔已下載');
      window.setTimeout(() => URL.revokeObjectURL(url), 3000);
    } catch (error) {
      console.error('Word export failed', error);
      document.body.dataset.wordExportStatus = 'error';
      window.alert(`Word 匯出失敗：${error?.message || '範本欄位格式錯誤'}`);
    }
  };
  window.__downloadCaseWord = downloadRecordWord;

  const addExportButtons = () => {
    document.querySelectorAll('.case-list-view .case-list-row').forEach(row => {
      const actions = row.querySelector('.case-list-row-actions');
      if (!actions) return;
      actions.querySelectorAll('.export-case').forEach(button => button.remove());
      if (!actions.querySelector('.export-word-case')) {
        const wordButton = document.createElement('button');
        wordButton.type = 'button';
        wordButton.className = 'btn export-word-case';
        wordButton.textContent = '匯出 Word';
        actions.append(wordButton);
      }
    });
  };

  document.addEventListener('click', event => {
    const button = event.target.closest('.case-list-view .export-word-case');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const row = button.closest('.case-list-row');
    const record = row ? recordForRow(row) : null;
    if (!record) {
      window.alert('找不到要匯出的案件資料。');
      return;
    }
    downloadRecordWord(record);
  }, true);

  const listContent = document.querySelector('.case-list-view .case-list-content');
  if (listContent) {
    const observer = new MutationObserver(addExportButtons);
    observer.observe(listContent, { childList: true, subtree: true });
  }
  addExportButtons();
})();

;

(() => {
  const field = name => document.querySelector(`#basic [name="${name}"]`)?.closest('.field');

  const birthDate = field('birth_date');
  const deathDate = field('death_date');
  const ethnicity = field('ethnicity');
  if (birthDate && deathDate && ethnicity) {
    birthDate.classList.add('basic-half-field');
    deathDate.classList.add('basic-half-field');
    birthDate.classList.add('basic-birth-date-field');
    deathDate.classList.add('basic-death-date-field');
    deathDate.style.setProperty('grid-column', '1 / -1', 'important');
    deathDate.style.setProperty('width', 'max-content');
    deathDate.style.setProperty('max-width', '100%');
    ethnicity.classList.add('basic-ethnicity-field');
    ethnicity.after(birthDate);
    birthDate.after(deathDate);
  }

  const burialType = field('burial_type');
  const towerLocation = field('tower_location');
  const burialLocation = field('burial_location');
  if (burialType && towerLocation && burialLocation) {
    [burialType, towerLocation, burialLocation].forEach(item => {
      item.classList.remove('wide', 'full');
      item.classList.add('burial-three-column-field');
    });
    const burialRow = document.createElement('div');
    burialRow.className = 'burial-three-column-row';
    burialType.before(burialRow);
    burialRow.append(burialType, towerLocation, burialLocation);
  }

  document.getElementById('completion')?.closest('.card')?.remove();
  document.getElementById('vendorCount')?.closest('.card')?.remove();
})();

;

(() => {
  const dateSelection = document.querySelector('#arrangement [name="date_selection"]');
  if (dateSelection && dateSelection.tagName === 'SELECT') {
    const hasNoneOption = [...dateSelection.options].some(option => option.value === '無');
    if (!hasNoneOption) {
      const noneOption = document.createElement('option');
      noneOption.value = '無';
      noneOption.textContent = '無';
      dateSelection.appendChild(noneOption);
    }
  }

  const obituaryInput = document.querySelector('#arrangement [name="obituary_style"]');
  if (obituaryInput) {
    const obituaryField = obituaryInput.closest('.field');
    const obituaryLabel = obituaryField?.querySelector(':scope > label');
    if (obituaryLabel) obituaryLabel.textContent = '訃聞樣式及張數';
    obituaryInput.placeholder = '例如：粉追思/30張';
  }
})();

;

document.querySelector('[name="ceremony_offerings"]')
    ?.setAttribute('placeholder', '例如：葷三牲X1、豬頭五牲X1');

;

(() => {
  const recordKey = 'funeral-case-records-v1';
  const nav = document.querySelector('.sidebar .nav');
  const overviewButton = [...(nav?.querySelectorAll(':scope > button') || [])]
    .find(button => button.textContent.includes('案件總覽'));
  if (!nav || !overviewButton || document.querySelector('.case-archive-navigation')) return;

  const archive = document.createElement('div');
  archive.className = 'case-archive-navigation';
  overviewButton.after(archive);
  const archiveView = document.createElement('section');
  archiveView.className = 'case-archive-view';
  document.querySelector('.section')?.before(archiveView);

  const records = () => {
    try {
      const value = JSON.parse(localStorage.getItem(recordKey) || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  };

  const dateParts = value => {
    const match = String(value || '').trim().match(/^(\d{3}|\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
    if (!match) return { year: '未排日期', month: '' };
    const year = Number(match[1]) + (match[1].length === 3 ? 1911 : 0);
    return { year: String(year), month: match[2].padStart(2, '0') };
  };

  const closeArchiveView = () => {
    archiveView.classList.remove('active');
    archive.querySelectorAll('button').forEach(button => button.classList.remove('archive-active'));
    document.querySelector('.top .actions')?.style.removeProperty('display');
  };

  const showMonthPage = (year, month) => {
    const filtered = records()
      .filter(record => {
        const parts = dateParts(record.fields?.death_date);
        return parts.year === year && parts.month === month;
      })
      .sort((a, b) =>
        String(a.fields?.case_no || '').localeCompare(
          String(b.fields?.case_no || ''),
          'zh-Hant',
          { numeric: true }
        )
      );
    const title = `${year}年${Number(month)}月案件`;
    const headerTitle = document.querySelector('.top h1');
    const topActions = document.querySelector('.top .actions');
    window.__closeAllAppViews();
    if (headerTitle) headerTitle.textContent = title;
    if (topActions) topActions.style.display = 'none';
    archiveView.classList.add('active');
    archiveView.innerHTML = `
      <h2>${title}</h2>
      <div class="case-archive-table-wrap">
        <div class="case-archive-header">
          <span>案件編號</span><span>案名</span><span>來源</span>
          <span>方案類型</span><span>地區</span>
        </div>
        <div class="case-archive-content"></div>
      </div>
    `;
    const content = archiveView.querySelector('.case-archive-content');

    if (!filtered.length) {
      content.innerHTML = '<p class="empty-list">此月份目前沒有案件。</p>';
    }

    filtered.forEach(record => {
      const fields = record.fields || {};
      const row = document.createElement('div');
      row.className = 'case-archive-row';
      const grid = document.createElement('div');
      grid.className = 'case-archive-data-grid';
      [
        fields.case_no,
        fields.case_name,
        fields.source,
        fields.case_type,
        String(fields.address || '').slice(0, 3)
      ].forEach(value => {
        const cell = document.createElement('span');
        cell.textContent = value || '—';
        grid.append(cell);
      });
      row.append(grid);

      const actions = document.createElement('div');
      actions.className = 'case-archive-actions';
      const editButton = document.createElement('button');
      editButton.type = 'button';
      editButton.className = 'btn';
      editButton.textContent = '編輯';
      editButton.addEventListener('click', () => {
        if (typeof window.__openCaseForEdit !== 'function') {
          window.alert('編輯功能尚未完成載入，請重新整理頁面。');
          return;
        }
        window.__openCaseForEdit(record);
      });
      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'btn delete-case';
      deleteButton.textContent = '刪除';
      deleteButton.addEventListener('click', () => {
        const caseNo = String(record?.fields?.case_no || '').trim();
        const caseName = record?.fields?.case_name || '未命名案件';
        if (!window.confirm(`確定要刪除案件「${caseNo} ${caseName}」嗎？`)) return;
        const allRecords = records();
        const index = allRecords.findIndex(item =>
          String(item?.fields?.case_no || '').trim() === caseNo
        );
        if (index < 0) {
          window.alert('刪除失敗：找不到案件資料。');
          return;
        }
        allRecords.splice(index, 1);
        localStorage.setItem(recordKey, JSON.stringify(allRecords));
        document.dispatchEvent(new CustomEvent('funeral:case-deleted', {
          detail: { caseNo }
        }));
        showMonthPage(year, month);
        window.flash?.('案件已刪除。');
      });

      const wordButton = document.createElement('button');
      wordButton.type = 'button';
      wordButton.className = 'btn export-word-case';
      wordButton.textContent = '匯出 Word';
      wordButton.addEventListener('click', () => {
        if (typeof window.__downloadCaseWord !== 'function') {
          window.alert('Word 匯出功能尚未完成載入，請重新整理頁面。');
          return;
        }
        window.__downloadCaseWord(record);
      });

      actions.append(editButton, deleteButton, wordButton);
      row.append(actions);
      content.append(row);
    });

    archive.querySelectorAll('button').forEach(button => button.classList.remove('archive-active'));
    archive.querySelector(`[data-year="${CSS.escape(year)}"][data-month="${CSS.escape(month)}"]`)
      ?.classList.add('archive-active');
  };

  const renderArchive = () => {
    const previouslyOpenYear = archive.querySelector('details[open]')?.dataset.year || '';
    const groups = new Map();
    records().forEach(record => {
      const { year, month } = dateParts(record.fields?.death_date);
      if (year === '未排日期') return;
      if (!groups.has(year)) groups.set(year, new Map());
      const months = groups.get(year);
      months.set(month, (months.get(month) || 0) + 1);
    });

    archive.innerHTML = '';
    if (!groups.size) {
      archive.innerHTML = '<div class="case-archive-empty">尚無案件目錄</div>';
      return;
    }

    const years = [...groups.keys()].sort((a, b) => a.localeCompare(b));
    const isMobile = window.matchMedia('(max-width: 850px)').matches;
    const currentYear = String(new Date().getFullYear());
    const mobileOpenYear = groups.has(previouslyOpenYear)
      ? previouslyOpenYear
      : groups.has(currentYear)
        ? currentYear
        : years[years.length - 1];

    years.forEach((year, yearIndex) => {
      const details = document.createElement('details');
      details.dataset.year = year;
      details.open = isMobile ? year === mobileOpenYear : yearIndex === 0;
      details.addEventListener('toggle', () => {
        if (!details.open || !window.matchMedia('(max-width: 850px)').matches) return;
        archive.querySelectorAll('details[open]').forEach(openDetails => {
          if (openDetails !== details) openDetails.open = false;
        });
      });
      const summary = document.createElement('summary');
      summary.textContent = year === '未排日期' ? '未排日期' : `${year}年`;
      details.append(summary);

      [...groups.get(year).entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([month, count]) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.dataset.year = year;
          button.dataset.month = month;
          button.textContent = year === '未排日期'
            ? `未排日期（${count}）`
            : `${Number(month)}月（${count}）`;
          button.addEventListener('click', event => {
            event.stopPropagation();
            showMonthPage(year, month);
          });
          details.append(button);
        });
      archive.append(details);
    });
  };

  overviewButton.addEventListener('click', () => {
    closeArchiveView();
    renderArchive();
  });
  nav.querySelectorAll(':scope > button').forEach(button => {
    if (button !== overviewButton) {
      button.addEventListener('click', () => {
        closeArchiveView();
        renderArchive();
      });
    }
  });
  document.addEventListener('funeral:case-saved', renderArchive);
  document.addEventListener('funeral:case-deleted', renderArchive);
  window.addEventListener('funeral-cloud-ready', () => window.setTimeout(renderArchive, 500));
  renderArchive();
})();

;

(() => {
  const scheduleBody = document.querySelector('#schedules tbody');
  const counter = document.getElementById('ritualCount');
  if (!scheduleBody || !counter) return;

  const updateScheduleCount = () => {
    const count = [...scheduleBody.querySelectorAll('tr.schedule-main-row')].filter(row =>
      [...row.querySelectorAll('input, select, textarea')].some(control => {
        if (control.type === 'checkbox' || control.type === 'radio') return control.checked;
        return String(control.value || '').trim() !== '';
      })
    ).length;
    counter.textContent = String(count);
  };

  ['input', 'change'].forEach(eventName => {
    scheduleBody.addEventListener(eventName, updateScheduleCount);
  });
  new MutationObserver(updateScheduleCount)
    .observe(scheduleBody, { childList: true, subtree: true });
  window.addEventListener('load', updateScheduleCount);
  updateScheduleCount();
})();

;

(() => {
  const nav = document.querySelector('.sidebar .nav');
  const overviewButton = [...(nav?.querySelectorAll(':scope > button') || [])]
    .find(button => /即將到期|案件總覽/.test(button.textContent || ''));
  const listButton = [...(nav?.querySelectorAll(':scope > button') || [])]
    .find(button => button.textContent.includes('案件列表'));
  const archive = document.querySelector('.case-archive-navigation');
  if (overviewButton) overviewButton.textContent = '⌂　即將到期';
  if (archive && listButton) listButton.after(archive);
  window.setTimeout(() => overviewButton?.click(), 120);
})();

;

(() => {
  const form = document.getElementById('caseForm');
  const recordsKey = 'funeral-case-records-v1';
  const draftKey = 'funeral-case-draft-v1';
  const orderKey = 'funeral-case-block-order-v1';
  if (!form) return;

  // 基本資料：來源與族群同列，出生／死亡日期同列且等寬。
  const basicGrid = document.querySelector('#basic .form-grid');
  const basicField = name => document.querySelector(`#basic [name="${name}"]`)?.closest('.field');
  const sourceField = basicField('source');
  const ethnicityField = basicField('ethnicity');
  const birthDateField = basicField('birth_date');
  const deathDateField = basicField('death_date');
  if (basicGrid) {
    const basicOrder = ['case_no', 'case_name', 'gender', 'case_type', 'religion', 'inspection_unit', 'funeral_date', 'source', 'ethnicity', 'birth_date', 'death_date', 'address'];
    basicOrder.forEach(name => { const field = basicField(name); if (field) basicGrid.append(field); });
  }
  if (sourceField) {
    sourceField.classList.remove('wide');
    sourceField.classList.add('basic-source');
  }
  if (ethnicityField) {
    ethnicityField.classList.remove('wide');
    ethnicityField.classList.add('basic-ethnicity');
  }
  if (birthDateField && deathDateField) {
    birthDateField.classList.add('basic-date');
    deathDateField.classList.add('basic-date');
  }
  const earthlyBranches = [['子','23:00–00:59'],['丑','01:00–02:59'],['寅','03:00–04:59'],['卯','05:00–06:59'],['辰','07:00–08:59'],['巳','09:00–10:59'],['午','11:00–12:59'],['未','13:00–14:59'],['申','15:00–16:59'],['酉','17:00–18:59'],['戌','19:00–20:59'],['亥','21:00–22:59']];
  const branchForTime = value => {
    const raw = String(value || '').trim();
    const normalized = /^\d{4}$/.test(raw) ? `${raw.slice(0, 2)}:${raw.slice(2)}` : raw;
    const match = normalized.match(/^(\d{1,2})(?::(\d{2}))?$/);
    if (!match) return '';
    const hour = Number(match[1]);
    const minute = Number(match[2] || 0);
    if (hour > 23 || minute > 59) return '';
    return earthlyBranches[hour === 23 ? 0 : Math.floor((hour + 1) / 2)]?.[0] || '';
  };
  const addTimeBranch = (field, name) => {
    if (!field || field.querySelector('.date-time-branch')) return;
    const dateInput = field.querySelector('input');
    if (!dateInput) return;
    const inline = document.createElement('div');
    inline.className = 'date-inline';
    const wrap = document.createElement('div');
    wrap.className = 'date-time-branch';
    const timeInput = document.createElement('input');
    timeInput.name = name;
    const isBirthTime = name === 'birth_time_branch';
    const dateName = isBirthTime ? 'birth_date' : 'death_date';
    const dateLabel = isBirthTime ? '出生' : '過世';
    const branch = document.createElement('input');
    branch.className = 'date-branch date-branch-output';
    branch.readOnly = true;
    branch.tabIndex = -1;
    branch.setAttribute('aria-label', `${dateLabel}時辰地支`);
    configure24HourTimeInput(timeInput, value => {
      const branchValue = branchForTime(value);
      branch.value = branchValue || '';
    });
    const lunarInput = document.createElement('input');
    lunarInput.className = 'basic-lunar-output';
    lunarInput.readOnly = true;
    lunarInput.tabIndex = -1;
    lunarInput.dataset.lunarFor = dateName;
    lunarInput.setAttribute('aria-label', `${dateLabel}日期農曆`);
    inline.classList.add('has-lunar-date');
    if (isBirthTime) {
      const dateExtraInput = document.createElement('input');
      dateExtraInput.name = 'birth_date_extra';
      dateExtraInput.className = 'basic-date-extra-input';
      dateExtraInput.setAttribute('aria-label', '出生日期補充');
      const lunarExtraInput = document.createElement('input');
      lunarExtraInput.name = 'birth_lunar_extra';
      lunarExtraInput.className = 'basic-lunar-extra-input';
      lunarExtraInput.setAttribute('aria-label', '出生農曆補充');
      lunarExtraInput.placeholder = '只知道農曆專用';
      inline.append(dateInput, lunarInput, dateExtraInput, lunarExtraInput, wrap);
    } else {
      inline.append(dateInput, lunarInput, wrap);
    }
    wrap.append(timeInput, branch);
    field.append(inline);
  };
  addTimeBranch(birthDateField, 'birth_time_branch');
  addTimeBranch(deathDateField, 'death_time_branch');

  // 自訂排序使用 Pointer Events，同一套操作同時支援滑鼠、觸控筆與手機觸控。
  const sortableItemForHandle = handle =>
    handle.closest('.row-drag-handle') ? handle.closest('tr') : handle.closest('.sortable-field-row');

  const prepareSortableItems = root => {
    (root || form).querySelectorAll('table:not(.life-mini-table) > tbody > tr').forEach(row => {
      if (row.querySelector(':scope > .row-drag-cell')) return;
      const cell = document.createElement('td');
      cell.className = 'row-drag-cell';
      const handle = document.createElement('button');
      handle.type = 'button';
      handle.className = 'row-drag-handle';
      handle.textContent = '⠿';
      handle.title = '拖曳本行排序';
      handle.setAttribute('aria-label', '拖曳本行排序');
      cell.append(handle);
      row.append(cell);
    });

    (root || form).querySelectorAll('.form-grid > .field').forEach(field => {
      field.classList.add('sortable-field-row');
      if (field.querySelector(':scope > .field-row-drag-handle')) return;
      const handle = document.createElement('button');
      handle.type = 'button';
      handle.className = 'field-row-drag-handle';
      handle.textContent = '⠿';
      handle.title = '拖曳此欄位排序';
      handle.setAttribute('aria-label', '拖曳此欄位排序');
      field.append(handle);
    });
  };

  form.querySelectorAll('.life-mini-table .row-drag-cell').forEach(cell => cell.remove());
  prepareSortableItems();
  new MutationObserver(records => {
    if (records.some(record => record.addedNodes.length)) prepareSortableItems();
  }).observe(form, { childList: true, subtree: true });

  let activePointerId = null;
  let draggedItem = null;
  let draggedHandle = null;

  const finishPointerSort = () => {
    draggedItem?.classList.remove('sorting-dragging');
    if (draggedHandle && activePointerId !== null) {
      try { draggedHandle.releasePointerCapture(activePointerId); } catch {}
    }
    activePointerId = null;
    draggedItem = null;
    draggedHandle = null;
  };

  form.addEventListener('pointerdown', event => {
    const handle = event.target.closest('.row-drag-handle, .field-row-drag-handle');
    if (!form.classList.contains('custom-sort-mode') || !handle || event.button > 0) return;
    const item = sortableItemForHandle(handle);
    if (!item) return;
    event.preventDefault();
    activePointerId = event.pointerId;
    draggedItem = item;
    draggedHandle = handle;
    draggedItem.classList.add('sorting-dragging');
    try { handle.setPointerCapture(activePointerId); } catch {}
  });

  form.addEventListener('pointermove', event => {
    if (event.pointerId !== activePointerId || !draggedItem) return;
    event.preventDefault();
    const hit = document.elementFromPoint(event.clientX, event.clientY);
    const target = hit?.closest('tbody tr, .sortable-field-row');
    if (!target || target === draggedItem || target.parentElement !== draggedItem.parentElement) return;
    const bounds = target.getBoundingClientRect();
    target.parentElement.insertBefore(
      draggedItem,
      event.clientY < bounds.top + bounds.height / 2 ? target : target.nextSibling
    );
  });

  form.addEventListener('pointerup', event => {
    if (event.pointerId === activePointerId) finishPointerSort();
  });
  form.addEventListener('pointercancel', event => {
    if (event.pointerId === activePointerId) finishPointerSort();
  });

  document.getElementById('customSortToggle')?.remove();
  const actions = document.querySelector('.top .actions');
  if (actions) {
    const sortButton = document.createElement('button');
    sortButton.type = 'button';
    sortButton.id = 'customSortToggle';
    sortButton.className = 'btn';
    sortButton.textContent = '自訂排序';
    sortButton.addEventListener('click', () => {
      const sorting = !form.classList.contains('custom-sort-mode');
      prepareSortableItems();
      form.classList.toggle('custom-sort-mode', sorting);
      sortButton.classList.toggle('sorting', sorting);
      sortButton.textContent = sorting ? '儲存排序' : '自訂排序';
      if (!sorting) {
        finishPointerSort();
        if (form.reportValidity?.()) form.requestSubmit?.();
        window.flash?.('排序已儲存。');
      }
    });
    actions.prepend(sortButton);
    const navButtons = [...document.querySelectorAll('.sidebar .nav > button')];
    const listButton = navButtons.find(button => button.textContent.includes('案件列表'));
    listButton?.addEventListener('click', () => {
      sortButton.hidden = true;
    });
    navButtons.filter(button => button !== listButton).forEach(button => {
      button.addEventListener('click', () => {
        sortButton.hidden = false;
      });
    });
  }

  // 擇日資料表：可新增多列，與案件一同儲存及載入。
  const tabs = form.closest('.section')?.querySelector('.tabs');
  const arrangementTab = tabs?.querySelector('[data-tab="arrangement"]');
  if (tabs && arrangementTab && !document.getElementById('date-selection-sheet')) {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.dataset.tab = 'date-selection-sheet';
    tab.textContent = '擇日資料表';
    arrangementTab.before(tab);
    const pane = document.createElement('div');
    pane.id = 'date-selection-sheet';
    pane.className = 'pane date-selection-pane';
    pane.innerHTML = `<div class="date-selection-content"><div class="date-selection-heading"><h2 class="section-title">擇日資料表</h2><button type="button" class="btn date-selection-export">匯出</button></div><div class="date-deceased-line"><span>亡者姓名：</span><input readonly data-case-summary="case_name"><span>享陽：</span><input readonly class="date-case-age" data-case-age><span>歲</span><span>地址：</span><input readonly data-case-summary="address"></div><div class="date-life-grid"><div class="date-life-card"><div class="date-life-label">生</div><div class="date-life-details"><div class="date-life-row"><span>農曆：</span><input name="selection_birth_lunar_year"><span>年</span><input name="selection_birth_lunar_month"><span>月</span><input name="selection_birth_lunar_day"><span>日</span><select name="selection_birth_lunar_time"><option value="">時</option></select><strong class="date-branch" data-selection-branch="selection_birth_lunar_time"></strong></div><div class="date-life-row"><span>國曆：</span><input readonly class="solar-date" data-date-part="birth_date" data-part="year"><span>年</span><input readonly class="solar-date" data-date-part="birth_date" data-part="month"><span>月</span><input readonly class="solar-date" data-date-part="birth_date" data-part="day"><span>日</span></div></div></div><div class="date-life-card"><div class="date-life-label">歿</div><div class="date-life-details"><div class="date-life-row"><span>農曆：</span><input name="selection_death_lunar_year"><span>年</span><input name="selection_death_lunar_month"><span>月</span><input name="selection_death_lunar_day"><span>日</span><select name="selection_death_lunar_time"><option value="">時</option></select><strong class="date-branch" data-selection-branch="selection_death_lunar_time"></strong></div><div class="date-life-row"><span>國曆：</span><input readonly class="solar-date" data-date-part="death_date" data-part="year"><span>年</span><input readonly class="solar-date" data-date-part="death_date" data-part="month"><span>月</span><input readonly class="solar-date" data-date-part="death_date" data-part="day"><span>日</span></div></div></div></div><div class="table-wrap"><table class="data-table" id="dateSelectionTable"><thead><tr><th>稱謂</th><th>姓名</th><th>出生日期</th><th></th></tr></thead><tbody></tbody></table></div><button type="button" class="add" id="addDateSelection">＋ 新增擇日資料</button></div>`;
    const familyTitle = document.createElement('h3');
    familyTitle.className = 'date-family-title';
    familyTitle.textContent = '家屬';
    pane.querySelector('.table-wrap')?.before(familyTitle);
    // 生、歿日期不在此頁重複輸入，直接顯示基本資料已填寫的結果。
    pane.querySelector('.date-life-grid')?.remove();
    const summaryLine = pane.querySelector('.date-deceased-line');
    if (summaryLine) {
      const dateRow = document.createElement('div');
      dateRow.className = 'date-basic-summary-row';
      summaryLine.after(dateRow);
      const addBasicDate = (label, name) => {
        const field = document.createElement('div');
        field.className = 'date-basic-summary-field';
        const title = document.createElement('label');
        title.textContent = label;
        const prefix = name === 'birth_date' ? 'birth' : 'death';
        const values = document.createElement('div');
        values.className = 'date-basic-summary-values';
        const dateInput = document.createElement('input');
        dateInput.id = `date-selection-${name}`;
        dateInput.readOnly = true;
        dateInput.dataset.dateWithTime = prefix;
        dateInput.className = 'date-basic-summary';
        const lunarInput = document.createElement('input');
        lunarInput.readOnly = true;
        lunarInput.tabIndex = -1;
        lunarInput.dataset.summaryLunar = prefix;
        lunarInput.className = 'date-basic-summary-lunar';
        lunarInput.setAttribute('aria-label', `${label}農曆`);
        const timeInput = document.createElement('input');
        timeInput.readOnly = true;
        timeInput.tabIndex = -1;
        timeInput.dataset.summaryTime = prefix;
        timeInput.className = 'date-basic-summary-time';
        timeInput.setAttribute('aria-label', `${label}時間`);
        const branchInput = document.createElement('input');
        branchInput.readOnly = true;
        branchInput.tabIndex = -1;
        branchInput.dataset.summaryBranch = prefix;
        branchInput.className = 'date-basic-summary-branch';
        branchInput.setAttribute('aria-label', `${label}時辰地支`);
        title.htmlFor = dateInput.id;
        values.append(dateInput, lunarInput, timeInput, branchInput);
        field.append(title, values);
        dateRow.append(field);
      };
      addBasicDate('出生日期', 'birth_date');
      addBasicDate('過世日期', 'death_date');
    }
    document.getElementById('arrangement').before(pane);
    tab.addEventListener('click', () => {
      tabs.querySelectorAll('button').forEach(button => button.classList.toggle('active', button === tab));
      form.querySelectorAll('.pane').forEach(item => item.classList.toggle('active', item === pane));
    });
    const gregorianYear = value => {
      const match = String(value || '').replaceAll('/', '-').match(/^(\d{3}|\d{4})-(\d{2})-(\d{2})$/);
      return match ? Number(match[1]) + (match[1].length === 3 ? 1911 : 0) : null;
    };
    const syncDateCaseSummary = () => {
      pane.querySelectorAll('[data-case-summary]').forEach(input => {
        input.value = form.elements[input.dataset.caseSummary]?.value || '';
      });
      pane.querySelectorAll('[data-date-with-time]').forEach(input => {
        const prefix = input.dataset.dateWithTime;
        const date = prefix === 'birth'
          ? form.elements.birth_date_extra?.value || form.elements.birth_date?.value || ''
          : form.elements.death_date?.value || '';
        const time = form.elements[`${prefix}_time_branch`]?.value || '';
        const branch = branchForTime(time);
        input.value = date;
        const field = input.closest('.date-basic-summary-field');
        const timeOutput = field?.querySelector(`[data-summary-time="${prefix}"]`);
        const branchOutput = field?.querySelector(`[data-summary-branch="${prefix}"]`);
        if (timeOutput) timeOutput.value = time;
        if (branchOutput) branchOutput.value = branch;
      });
      const birth = String(form.elements.birth_date_extra?.value || form.elements.birth_date?.value || '').replaceAll('/', '-');
      const death = String(form.elements.death_date?.value || '').replaceAll('/', '-');
      const age = pane.querySelector('[data-case-age]');
      if (age) {
        const firstYear = gregorianYear(birth);
        const lastYear = gregorianYear(death);
        age.value = firstYear && lastYear ? Math.max(0, lastYear - firstYear + 1) : '';
      }
      window.refreshContentSizedFields?.(pane);
      window.__refreshDateSelectionLunar?.();
    };
    window.__syncDateCaseSummary = syncDateCaseSummary;
    ['case_name', 'address', 'birth_date', 'birth_date_extra', 'birth_lunar_extra', 'death_date', 'birth_time_branch', 'death_time_branch'].forEach(name => {
      form.elements[name]?.addEventListener('input', syncDateCaseSummary);
      form.elements[name]?.addEventListener('change', syncDateCaseSummary);
    });
    syncDateCaseSummary();
    pane.querySelectorAll('select[name$="_lunar_time"]').forEach(select => {
      earthlyBranches.forEach(([branch, time]) => select.insertAdjacentHTML('beforeend', `<option value="${branch}">${time}（${branch}）</option>`));
      const output = pane.querySelector(`[data-selection-branch="${select.name}"]`);
      select.addEventListener('change', () => { if (output) output.textContent = select.value || ''; });
      if (output) output.textContent = select.value || '';
    });
    const exportDateSelection = async () => {
      syncDateCaseSummary();
      const sourceTable = pane.querySelector('#dateSelectionTable');
      if (!sourceTable) {
        window.alert('找不到擇日資料表，無法匯出。');
        return;
      }
      await document.fonts?.ready;
      const caseName = String(form.elements.case_name?.value || '').trim() || '擇日資料表';
      const fieldValue = name => String(form.elements[name]?.value || '').trim();
      const summaryValue = selector => String(pane.querySelector(selector)?.value || '').trim();
      const summaryDateValue = prefix => {
        const field = pane.querySelector(`[data-date-with-time="${prefix}"]`)?.closest('.date-basic-summary-field');
        if (!field) return '';
        return [
          field.querySelector(`[data-date-with-time="${prefix}"]`)?.value,
          field.querySelector(`[data-summary-lunar="${prefix}"]`)?.value,
          field.querySelector(`[data-summary-time="${prefix}"]`)?.value,
          field.querySelector(`[data-summary-branch="${prefix}"]`)?.value
        ].map(value => String(value || '').trim()).filter(Boolean).join('　');
      };
      const familyRows = [...sourceTable.tBodies[0].rows].map(row => ({
        honorific: String(row.querySelector('[name="selection_honorific"]')?.value || '').trim(),
        name: String(row.querySelector('[name="selection_person_name"]')?.value || '').trim(),
        lunarBirth: String(row.querySelector('[name="selection_lunar_birth"]')?.value || '').trim(),
        solarBirth: String(row.querySelector('[name="selection_solar_birth"]')?.value || '').trim()
      })).filter(row => Object.values(row).some(Boolean));

      // A4 橫式 3508 × 2480 像素，嵌入 841.89 × 595.28 pt 頁面後為 300 DPI。
      const pageWidth = 3508;
      const pageHeight = 2480;
      const margin = 170;
      const contentWidth = pageWidth - margin * 2;
      const pages = [];
      let canvas;
      let context;
      let y;

      const drawLine = (x1, y1, x2, y2, color = '#cbd5e1', width = 3) => {
        context.beginPath();
        context.moveTo(x1, y1);
        context.lineTo(x2, y2);
        context.strokeStyle = color;
        context.lineWidth = width;
        context.stroke();
      };
      const fillText = (text, x, top, maxWidth) => {
        const value = String(text || '');
        if (!maxWidth || context.measureText(value).width <= maxWidth) {
          context.fillText(value, x, top);
          return;
        }
        let fitted = value;
        while (fitted && context.measureText(`${fitted}…`).width > maxWidth) fitted = fitted.slice(0, -1);
        context.fillText(`${fitted}…`, x, top);
      };
      const drawPageHeader = continued => {
        context.fillStyle = '#115d54';
        context.font = 'bold 76px "Microsoft JhengHei", "Noto Sans TC", sans-serif';
        context.fillText(`${caseName}－擇日資料表${continued ? '（續）' : ''}`, margin, margin);
        drawLine(margin, margin + 112, pageWidth - margin, margin + 112, '#197a6e', 6);
        y = margin + 160;
      };
      const newPage = continued => {
        canvas = document.createElement('canvas');
        canvas.width = pageWidth;
        canvas.height = pageHeight;
        context = canvas.getContext('2d');
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, pageWidth, pageHeight);
        context.textBaseline = 'top';
        pages.push(canvas);
        drawPageHeader(continued);
      };
      const drawSummary = () => {
        const deceasedName = summaryValue('[data-case-summary="case_name"]') || caseName;
        const age = summaryValue('[data-case-age]');
        const address = summaryValue('[data-case-summary="address"]') || fieldValue('address');
        const birth = summaryDateValue('birth') || fieldValue('birth_date');
        const death = summaryDateValue('death') || fieldValue('death_date');
        const rows = [
          [`亡者姓名：${deceasedName}`, `享陽：${age ? `${age} 歲` : ''}`],
          [`出生日期：${birth}`, `過世日期：${death}`],
          [`地址：${address}`, '']
        ];
        context.font = '44px "Microsoft JhengHei", "Noto Sans TC", sans-serif';
        context.fillStyle = '#17212b';
        rows.forEach(([left, right], index) => {
          const rowHeight = index === 2 ? 110 : 92;
          const isDateRow = index === 1;
          context.fillStyle = index % 2 ? '#ffffff' : '#f8fafc';
          context.fillRect(margin, y, contentWidth, rowHeight);
          context.strokeStyle = '#cbd5e1';
          context.lineWidth = 3;
          context.strokeRect(margin, y, contentWidth, rowHeight);
          context.fillStyle = '#17212b';
          context.font = `${isDateRow ? 38 : 44}px "Microsoft JhengHei", "Noto Sans TC", sans-serif`;
          fillText(left, margin + 28, y + 23, index === 2 ? contentWidth - 56 : contentWidth * (isDateRow ? .47 : .62));
          if (right) fillText(right, margin + contentWidth * (isDateRow ? .51 : .66), y + 23, contentWidth * (isDateRow ? .46 : .31));
          y += rowHeight;
        });
        y += 68;
      };

      const columnWidths = [430, 620, 1059, 1059];
      const headers = ['稱謂', '姓名', '農曆出生日期', '國曆出生日期'];
      const rowHeight = 150;
      const headerHeight = 112;
      const drawTableHeader = () => {
        let x = margin;
        context.font = 'bold 43px "Microsoft JhengHei", "Noto Sans TC", sans-serif';
        headers.forEach((header, index) => {
          context.fillStyle = '#e8f5f1';
          context.fillRect(x, y, columnWidths[index], headerHeight);
          context.strokeStyle = '#a8c7c2';
          context.lineWidth = 3;
          context.strokeRect(x, y, columnWidths[index], headerHeight);
          context.fillStyle = '#334155';
          context.textAlign = 'center';
          context.fillText(header, x + columnWidths[index] / 2, y + 30);
          x += columnWidths[index];
        });
        context.textAlign = 'left';
        y += headerHeight;
      };
      const drawFamilyRow = row => {
        let x = margin;
        context.font = '41px "Microsoft JhengHei", "Noto Sans TC", sans-serif';
        [row.honorific, row.name, row.lunarBirth, row.solarBirth].forEach((value, index) => {
          context.fillStyle = '#ffffff';
          context.fillRect(x, y, columnWidths[index], rowHeight);
          context.strokeStyle = '#cbd5e1';
          context.lineWidth = 3;
          context.strokeRect(x, y, columnWidths[index], rowHeight);
          context.fillStyle = '#17212b';
          fillText(value, x + 24, y + 48, columnWidths[index] - 48);
          x += columnWidths[index];
        });
        y += rowHeight;
      };

      newPage(false);
      drawSummary();
      context.fillStyle = '#115d54';
      context.font = 'bold 54px "Microsoft JhengHei", "Noto Sans TC", sans-serif';
      context.fillText('家屬', margin, y);
      y += 84;
      drawTableHeader();
      const rowsToDraw = familyRows.length ? familyRows : [{
        honorific: '',
        name: '目前無家屬資料',
        lunarBirth: '',
        solarBirth: ''
      }];
      rowsToDraw.forEach(row => {
        if (y + rowHeight > pageHeight - margin) {
          newPage(true);
          drawTableHeader();
        }
        drawFamilyRow(row);
      });

      const encoder = new TextEncoder();
      const encode = text => encoder.encode(text);
      const concat = arrays => {
        const length = arrays.reduce((sum, array) => sum + array.length, 0);
        const result = new Uint8Array(length);
        let position = 0;
        arrays.forEach(array => {
          result.set(array, position);
          position += array.length;
        });
        return result;
      };
      const jpegBytes = pages.map(page => {
        const base64 = page.toDataURL('image/jpeg', .95).split(',')[1];
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
        return bytes;
      });
      const objectCount = 2 + pages.length * 3;
      const objects = new Array(objectCount + 1);
      const pageReferences = [];
      jpegBytes.forEach((image, index) => {
        const pageObject = 3 + index * 3;
        const imageObject = pageObject + 1;
        const contentObject = pageObject + 2;
        pageReferences.push(`${pageObject} 0 R`);
        objects[pageObject] = encode(
          `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 841.89 595.28] ` +
          `/Resources << /XObject << /Im0 ${imageObject} 0 R >> >> /Contents ${contentObject} 0 R >>`
        );
        objects[imageObject] = concat([
          encode(
            `<< /Type /XObject /Subtype /Image /Width ${pageWidth} /Height ${pageHeight} ` +
            `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.length} >>\nstream\n`
          ),
          image,
          encode('\nendstream')
        ]);
        const drawing = encode('q 841.89 0 0 595.28 0 0 cm /Im0 Do Q');
        objects[contentObject] = concat([
          encode(`<< /Length ${drawing.length} >>\nstream\n`),
          drawing,
          encode('\nendstream')
        ]);
      });
      objects[1] = encode('<< /Type /Catalog /Pages 2 0 R >>');
      objects[2] = encode(`<< /Type /Pages /Kids [${pageReferences.join(' ')}] /Count ${pages.length} >>`);
      const pdfParts = [encode('%PDF-1.4\n')];
      const offsets = new Array(objectCount + 1).fill(0);
      let offset = pdfParts[0].length;
      for (let number = 1; number <= objectCount; number += 1) {
        const objectBytes = concat([encode(`${number} 0 obj\n`), objects[number], encode('\nendobj\n')]);
        offsets[number] = offset;
        pdfParts.push(objectBytes);
        offset += objectBytes.length;
      }
      const xrefOffset = offset;
      let xref = `xref\n0 ${objectCount + 1}\n0000000000 65535 f \n`;
      for (let number = 1; number <= objectCount; number += 1) {
        xref += `${String(offsets[number]).padStart(10, '0')} 00000 n \n`;
      }
      xref += `trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
      pdfParts.push(encode(xref));

      const file = new Blob(pdfParts, { type:'application/pdf' });
      const fileUrl = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = `${caseName.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')}－擇日資料表.pdf`;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(fileUrl), 3000);
    };
    pane.querySelector('.date-selection-export')?.addEventListener('click', exportDateSelection);
    const lunarInfoFromSolarDate = value => {
      const rawValue = String(value || '').trim();
      const packedValue = rawValue.match(/^(\d{4})(\d{2})(\d{2})$/);
      const normalizedValue = packedValue ? `${packedValue[1]}-${packedValue[2]}-${packedValue[3]}` : rawValue.replaceAll('/', '-');
      const parts = normalizedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!parts) return null;
      const date = new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
      if (Number.isNaN(date.getTime()) || date.getFullYear() !== Number(parts[1]) || date.getMonth() !== Number(parts[2]) - 1 || date.getDate() !== Number(parts[3])) return null;
      const formatter = new Intl.DateTimeFormat('zh-TW-u-ca-chinese', { year: 'numeric', month: 'long', day: 'numeric' });
      const lunarParts = formatter.formatToParts(date);
      const find = type => lunarParts.find(part => part.type === type)?.value || '';
      const year = Number(find('relatedYear') || find('year'));
      const monthText = find('month');
      const monthMap = { 正: 1, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 十一: 11, 冬: 11, 十二: 12, 臘: 12 };
      const month = monthMap[String(monthText).replace('閏', '').replace('月', '')];
      const day = Number(String(find('day')).replace(/\D/g, ''));
      if (!Number.isFinite(year) || !month || !day) return null;
      const stems = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
      const branches = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
      const leap = String(monthText).includes('閏') ? '閏' : '';
          const sexagenaryYear = year;
      return { year: sexagenaryYear, lunarYear: year, text: `${stems[(sexagenaryYear - 4) % 10]}${branches[(sexagenaryYear - 4) % 12]}年農${leap}${month}/${day}` };
    };
    // 擇日資料表的農、國曆雙向換算。農曆可輸入：乙巳年農12/16 或 2025年農12/16。
    const solarValueForDate = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const rocValueForDate = date => `${String(date.getFullYear() - 1911).padStart(3, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
    const normalizeSolarInput = value => {
      const raw = String(value || '').trim().replaceAll('/', '-');
      const packed = raw.match(/^(\d{3}|\d{4})(\d{2})(\d{2})$/);
      const normalized = packed ? `${packed[1]}-${packed[2]}-${packed[3]}` : raw;
      const match = normalized.match(/^(\d{3}|\d{4})-(\d{2})-(\d{2})$/);
      if (!match) return normalized;
      const year = Number(match[1]) + (match[1].length === 3 ? 1911 : 0);
      return `${year}-${match[2]}-${match[3]}`;
    };
    const parseLunarInput = value => {
      const source = String(value || '').replace(/\s/g, '');
      const named = source.match(/^([\u7532\u4e59\u4e19\u4e01\u620a\u5df1\u5e9a\u8f9b\u58ec\u7678][\u5b50\u4e11\u5bc5\u536f\u8fb0\u5df3\u5348\u672a\u7533\u9149\u620c\u4ea5])\u5e74?(?:\u8fb2)?(\u958f?)(\d{1,2})[\/_\u6708](\d{1,2})$/);
      if (named) return { cycle: named[1], leap: Boolean(named[2]), month: Number(named[3]), day: Number(named[4]) };
      const numbered = source.match(/^(\d{4})\u5e74?(?:\u8fb2)?(\u958f?)(\d{1,2})[\/_\u6708](\d{1,2})$/);
      if (numbered) return { lunarYear: Number(numbered[1]), leap: Boolean(numbered[2]), month: Number(numbered[3]), day: Number(numbered[4]) };
      return null;
    };
    const lunarPartsFromText = text => {
      const match = String(text || '').match(/^([\u7532\u4e59\u4e19\u4e01\u620a\u5df1\u5e9a\u8f9b\u58ec\u7678][\u5b50\u4e11\u5bc5\u536f\u8fb0\u5df3\u5348\u672a\u7533\u9149\u620c\u4ea5])\u5e74\u8fb2(\u958f?)(\d{1,2})\/(\d{1,2})$/);
      return match ? { cycle: match[1], leap: Boolean(match[2]), month: Number(match[3]), day: Number(match[4]) } : null;
    };
    const solarFromLunarInput = (value, referenceSolar) => {
      const wanted = parseLunarInput(value);
      if (!wanted || wanted.month < 1 || wanted.month > 12 || wanted.day < 1 || wanted.day > 30) return null;
      const referenceYear = Number((normalizeSolarInput(referenceSolar).match(/^(\d{4})/) || [])[1]) || new Date().getFullYear();
      const stems = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
      const branches = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
      const starts = wanted.lunarYear
        ? [wanted.lunarYear - 1, wanted.lunarYear, wanted.lunarYear + 1]
        : Array.from({ length: 201 }, (_, index) => 1900 + index)
            .filter(year => `${stems[(year - 4) % 10]}${branches[(year - 4) % 12]}` === wanted.cycle)
            .sort((left, right) => Math.abs(left - referenceYear) - Math.abs(right - referenceYear));
      for (const startYear of [...new Set(starts)].filter(year => year >= 1900 && year <= 2100)) {
        const start = new Date(startYear, 0, 1);
        for (let offset = 0; offset <= 430; offset += 1) {
          const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset);
          const info = lunarInfoFromSolarDate(solarValueForDate(date));
          const lunar = lunarPartsFromText(info?.text);
          if (!info || !lunar || lunar.month !== wanted.month || lunar.day !== wanted.day || lunar.leap !== wanted.leap) continue;
          if (wanted.cycle && lunar.cycle !== wanted.cycle) continue;
          if (wanted.lunarYear && info.lunarYear !== wanted.lunarYear) continue;
          return { value: rocValueForDate(date), info };
        }
      }
      return null;
    };
    const addDateSelection = values => {
      const row = document.createElement('tr');
      row.innerHTML = '<td><input name="selection_honorific" placeholder="稱謂"></td><td><input name="selection_person_name" placeholder="姓名"></td><td class="birth-cell"><table class="life-mini-table"><tbody><tr><th>農</th><td><input name="selection_lunar_birth" placeholder="乙巳年農12/16"></td></tr><tr><th>國</th><td><input name="selection_solar_birth" placeholder="YYY/MM/DD"></td></tr></tbody></table></td><td><button type="button" class="btn remove" style="padding:6px 9px">刪除</button></td>';
      row.querySelector('[name="selection_honorific"]').value = values?.title || '';
      row.querySelector('[name="selection_person_name"]').value = values?.name || '';
      row.querySelector('[name="selection_lunar_birth"]').value = values?.lunarBirth || '';
      row.querySelector('[name="selection_solar_birth"]').value = values?.solarBirth || '';
      const solarInput = row.querySelector('[name="selection_solar_birth"]');
      const lunarInput = row.querySelector('[name="selection_lunar_birth"]');
      let isSynchronizing = false;
      const updateFromSolar = () => {
        if (isSynchronizing) return;
        const normalized = normalizeSolarInput(solarInput.value);
        const lunar = lunarInfoFromSolarDate(normalized);
        if (!normalized || !lunar) return;
        const date = new Date(`${normalized}T12:00:00`);
        solarInput.value = Number.isNaN(date.getTime()) ? solarInput.value : rocValueForDate(date);
        lunarInput.value = lunar.text;
      };
      const updateFromLunar = () => {
        if (isSynchronizing || !lunarInput.value.trim()) return;
        const result = solarFromLunarInput(lunarInput.value, solarInput.value);
        if (!result) return;
        isSynchronizing = true;
        solarInput.value = result.value;
        lunarInput.value = result.info.text;
        isSynchronizing = false;
      };
      solarInput.addEventListener('input', updateFromSolar);
      solarInput.addEventListener('change', updateFromSolar);
      lunarInput.addEventListener('change', updateFromLunar);
      lunarInput.addEventListener('blur', updateFromLunar);
      lunarInput.addEventListener('keydown', event => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        updateFromLunar();
      });
      if (solarInput.value) updateFromSolar();
      else if (lunarInput.value) updateFromLunar();
      row.querySelector('.remove').addEventListener('click', () => row.remove());
      const tableBody = document.querySelector('#dateSelectionTable tbody');
      if (!tableBody) return;
      tableBody.append(row);
    };
    document.getElementById('addDateSelection').addEventListener('click', () => addDateSelection());
    window.__addDateSelection = addDateSelection;
  }

  // 將擇日資料、已下單的法事列，一併放進既有的案件資料。
  const originalCollect = window.collect;
  if (typeof originalCollect === 'function' && !window.__enhancedCollect) {
    window.__enhancedCollect = true;
    window.collect = function () {
      const data = originalCollect();
      data.dateSelections = [...document.querySelectorAll('#dateSelectionTable > tbody > tr')].map(row => {
        const fieldValue = name => row.querySelector(`[name="${name}"]`)?.value || '';
        return {
          title: fieldValue('selection_honorific'),
          name: fieldValue('selection_person_name'),
          lunarBirth: fieldValue('selection_lunar_birth'),
          solarBirth: fieldValue('selection_solar_birth')
        };
      }).filter(item => Object.values(item).some(value => String(value).trim()));
      data.scheduleOrders = [...document.querySelectorAll('#schedules tbody tr.schedule-main-row')].map(row => row.dataset.lineOrdered === 'true');
      return data;
    };
  }
  const originalLoad = window.load;
  if (typeof originalLoad === 'function' && !window.__enhancedLoad) {
    window.__enhancedLoad = true;
    window.load = function (data) {
      const result = originalLoad(data || {});
      refreshBasicTimeBranches(document.getElementById('caseForm') || document);
      window.__syncDateCaseSummary?.();
      const target = document.querySelector('#dateSelectionTable tbody');
      if (target) {
        target.innerHTML = '';
        (data?.dateSelections || [])
          .filter(item => item && [item.title, item.name, item.lunarBirth, item.solarBirth]
            .some(value => String(value || '').trim()))
          .forEach(item => window.__addDateSelection?.(item));
      }
      [...document.querySelectorAll('#schedules tbody tr.schedule-main-row')].forEach((row, index) => {
        row.dataset.lineOrdered = data?.scheduleOrders?.[index] ? 'true' : 'false';
      });
      window.__refreshLineOrderButton?.();
      return result;
    };
  }

  // 每一批尚未送出的法事安排只會送一次；新增一列後會再次開放下單。
  const scheduleTable = document.getElementById('schedules');
  const scheduleBody = scheduleTable?.tBodies?.[0];
  const orderHeading = scheduleTable?.closest('.block')?.querySelector('.fieldset-title');
  if (scheduleBody && orderHeading) {
    document.getElementById('lineOrderGroup')?.closest('.line-order-controls')?.remove();
    document.getElementById('lineAutoOrder')?.remove();
    orderHeading.classList.add('ritual-schedule-heading');
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'lineAutoOrder';
    button.textContent = '自動下單';
    button.title = '透過 LINE 官方帳號傳送到所選的單一群組';
    const controls = document.createElement('div');
    controls.className = 'line-order-controls';
    const groupSelect = document.createElement('select');
    groupSelect.id = 'lineOrderGroup';
    groupSelect.innerHTML = '<option value="">載入可用群組…</option>';
    // 把群組選擇與按鈕包成同一組，避免標題列的排版將兩者拉開。
    controls.append(groupSelect, button);
    orderHeading?.append(controls);
    const loadGroups = async () => {
      const cloud = window.funeralCloud?.client;
      const companyId = window.funeralCloud?.companyId;
      if (!cloud || !companyId) {
        groupSelect.innerHTML = '<option value="">請先登入後載入群組</option>';
        return;
      }
      const { data, error } = await cloud.from('line_groups')
        .select('group_id, group_name')
        .eq('company_id', companyId)
        .eq('active', true)
        .order('bound_at', { ascending: true });
      if (error || !data?.length) {
        groupSelect.innerHTML = '<option value="">尚未綁定可用群組</option>';
        return;
      }
      groupSelect.innerHTML = '<option value="">請選擇傳送群組</option>' + data.map(group =>
        `<option value="${String(group.group_id).replaceAll('&','&amp;').replaceAll('"','&quot;')}">${String(group.group_name || 'LINE 群組').replaceAll('&','&amp;').replaceAll('<','&lt;')}</option>`
      ).join('');
    };
    window.addEventListener('funeral-cloud-ready', loadGroups);
    setTimeout(loadGroups, 700);
    const isFilled = row => [...row.querySelectorAll('input,select,textarea')].some(control => String(control.value || '').trim());
    const scheduleRows = () => [...(scheduleBody?.querySelectorAll('tr.schedule-main-row') || [])];
    const refresh = () => {
      const hasPending = scheduleRows().some(row => isFilled(row) && row.dataset.lineOrdered !== 'true');
      if (hasPending) { button.disabled = false; button.classList.remove('line-order-complete'); button.textContent = '自動下單'; }
      else if (scheduleRows().some(row => row.dataset.lineOrdered === 'true')) { button.disabled = true; button.classList.add('line-order-complete'); button.textContent = '已下單'; }
      else { button.disabled = false; button.classList.remove('line-order-complete'); button.textContent = '自動下單'; }
    };
    window.__refreshLineOrderButton = refresh;
    new MutationObserver(refresh).observe(scheduleBody, { childList: true, subtree: true });
    scheduleBody?.addEventListener('input', refresh);
    scheduleBody?.addEventListener('change', refresh);
    button.addEventListener('click', async () => {
      if (!window.funeralCloud?.sendLineOrder) { window.alert('LINE 自動下單尚未完成設定。'); return; }
      const selectedGroupId = String(groupSelect.value || '').trim();
      if (!selectedGroupId) { window.alert('請先選擇要傳送的 LINE 群組。'); return; }
      const rows = scheduleRows();
      const indexes = rows.map((row, index) => ({ row, index })).filter(entry => isFilled(entry.row) && entry.row.dataset.lineOrdered !== 'true');
      if (!indexes.length) { window.alert('沒有新的法事安排可以下單。'); refresh(); return; }
      const caseData = window.collect?.() || {};
      const schedules = indexes.map(entry => caseData.schedules?.[entry.index]).filter(Boolean);
      button.disabled = true; button.textContent = '下單中…';
      try {
        const result = await window.funeralCloud.sendLineOrder({
          event: 'funeral_case_auto_order', sent_at: new Date().toISOString(),
          case_no: caseData.fields?.case_no || '', case_name: caseData.fields?.case_name || '',
          religion: caseData.fields?.religion || '', ceremony_location: caseData.fields?.ceremony_location || '',
          line_group_id: selectedGroupId, schedules
        });
        indexes.forEach(entry => { entry.row.dataset.lineOrdered = 'true'; });
        window.flash?.(`已由 LINE 官方帳號送出到 ${result.sent || 0} 個群組。`);
        form.requestSubmit?.();
        refresh();
      } catch (error) {
        window.alert(`自動下單失敗：${error.message}`);
        refresh();
      }
    });
    refresh();
  }
})();

;

(() => {
  const form = document.getElementById('caseForm');
  const nav = document.querySelector('.sidebar .nav');
  const overview = document.querySelector('.case-overview-view');
  const dueButton = [...(nav?.querySelectorAll(':scope > button') || [])]
    .find(button => /即將到期|案件總覽/.test(button.textContent || ''));

  const parseDate = value => {
    const match = String(value || '').match(/(\d{3}|\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
    if (!match) return null;
    const year = Number(match[1]) + (match[1].length === 3 ? 1911 : 0);
    const date = new Date(year, Number(match[2]) - 1, Number(match[3]), 12);
    return Number.isNaN(date.getTime()) ? null : date;
  };
  const records = () => {
    try {
      const rows = JSON.parse(localStorage.getItem('funeral-case-records-v1') || '[]');
      return Array.isArray(rows) ? rows : [];
    } catch { return []; }
  };
  const showDueOverview = () => {
    if (!overview) return;
    const title = document.querySelector('.top h1');
    window.__closeAllAppViews();
    overview.classList.add('active');
    if (title) title.textContent = '即將到期';
    document.querySelector('.top .actions')?.style.setProperty('display', 'none');
    dueButton?.classList.add('active');

    const target = overview.querySelector('.overview-list-content');
    const cards = overview.querySelector('.overview-cards');
    const heading = overview.querySelector('.overview-list h2');
    if (!target || !cards || !heading) return;
    heading.textContent = '即將到期';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const calendarDay = date => Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    ) / 86400000;
    const daysUntil = date => calendarDay(date) - calendarDay(today);
    const isWithin90Days = date => {
      const days = daysUntil(date);
      return days >= 0 && days <= 90;
    };
    const items = [];
    records().forEach(record => {
      const fields = record?.fields || {};
      [['funeral_date', '出殯'], ['hundred_days', '百日'], ['anniversary', '對年']].forEach(([key, label]) => {
        const date = parseDate(fields[key]);
        if (date && isWithin90Days(date)) {
          items.push({ date, label, fields, detail: fields.case_name || '未命名案件' });
        }
      });
      (Array.isArray(record?.schedules) ? record.schedules : []).forEach(schedule => {
        const date = parseDate(schedule?.date);
        if (!date || !isWithin90Days(date)) return;
        const caseName = fields.case_name || '未命名案件';
        const scheduleItem = String(schedule?.item || '').trim() || '未命名法事';
        items.push({
          date,
          label: scheduleItem,
          dateLabel: '功德法事',
          fields,
          detail: caseName
        });
      });
    });
    items.sort((a, b) => a.date - b.date);
    const tomorrow = items.filter(item => daysUntil(item.date) === 1).length;
    const nextThreeDays = items.filter(item => daysUntil(item.date) <= 3).length;
    const nextWeek = items.filter(item => daysUntil(item.date) <= 7).length;
    cards.innerHTML = [
      ['明天到期', tomorrow],
      ['3 天內到期', nextThreeDays],
      ['7 天內到期', nextWeek],
      ['90 天內到期', items.length]
    ]
      .map(([label, value]) => `<div class="card"><div class="metric">${label}</div><div class="number">${value}</div></div>`).join('');
    target.innerHTML = items.length ? '' : '<p class="empty-list">未來 90 天沒有出殯、功德法事、百日或對年的到期事項。</p>';
    items.forEach(item => {
      const row = document.createElement('div');
      row.className = 'overview-row due-row';
      const typeClass = ['百日', '對年'].includes(item.label)
        ? ' due-type-memorial'
        : item.label === '出殯'
          ? ' due-type-funeral'
          : '';
      row.innerHTML = `<strong>${item.fields.case_no || '未編號'}</strong><div><span class="due-type${typeClass}">${item.label}</span>${item.detail}</div><span class="due-date">${item.dateLabel || item.label}：${item.date.getFullYear()}/${String(item.date.getMonth() + 1).padStart(2, '0')}/${String(item.date.getDate()).padStart(2, '0')}</span>`;
      target.append(row);
    });
  };
  if (dueButton && !dueButton.dataset.dueRepairBound) {
    dueButton.dataset.dueRepairBound = 'true';
    dueButton.addEventListener('click', () => window.setTimeout(showDueOverview, 0));
  }

  const lunarText = value => {
    const date = parseDate(value);
    if (!date) return '';
    const parts = new Intl.DateTimeFormat('zh-TW-u-ca-chinese', { year: 'numeric', month: 'long', day: 'numeric' }).formatToParts(date);
    const find = type => parts.find(part => part.type === type)?.value || '';
    const year = Number(find('relatedYear') || find('year'));
    const monthText = find('month');
    const monthMap = { 正: 1, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 十一: 11, 冬: 11, 十二: 12, 臘: 12 };
    const month = monthMap[String(monthText).replace('閏', '').replace('月', '')];
    const day = Number(String(find('day')).replace(/\D/g, ''));
    if (!Number.isFinite(year) || !month || !day) return '';
    const stems = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
    const branches = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
    const leap = String(monthText).includes('閏') ? '閏' : '';
    const sexagenaryYear = date.getFullYear() - (date.getMonth() === 1 && date.getDate() < 4 ? 1 : 0);
    return `${stems[(sexagenaryYear - 4) % 10]}${branches[(sexagenaryYear - 4) % 12]}年農${leap}${month}/${day}`;
  };
  const refreshDateSelectionLunar = () => {
    document.querySelectorAll('#date-selection-sheet [data-date-with-time]').forEach(input => {
      const prefix = input.dataset.dateWithTime;
      const output = input.parentElement?.querySelector(`[data-summary-lunar="${prefix}"]`);
      if (!output) return;
      const manualLunar = prefix === 'birth'
        ? String(form?.elements.birth_lunar_extra?.value || '').trim()
        : '';
      output.value = manualLunar || lunarText(input.value);
    });
  };
  window.__refreshDateSelectionLunar = refreshDateSelectionLunar;
  form?.addEventListener('input', () => window.setTimeout(refreshDateSelectionLunar, 0));
  form?.addEventListener('change', () => window.setTimeout(refreshDateSelectionLunar, 0));
  window.setTimeout(refreshDateSelectionLunar, 0);
})();

;

(() => {
  const stems = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  const branches = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  const monthMap = { 正: 1, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 十一: 11, 冬: 11, 十二: 12, 臘: 12 };
  const labels = { funeral_date: '出殯日期', birth_date: '出生日期', death_date: '過世日期' };
  const solarDate = (value, rocYear = false) => {
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : new Date(value.getFullYear(), value.getMonth(), value.getDate());
    }
    const normalized = String(value || '').trim().replaceAll('/', '-');
    const packed = normalized.match(rocYear ? /^(\d{3})(\d{2})(\d{2})$/ : /^(\d{4})(\d{2})(\d{2})$/);
    const source = packed ? `${packed[1]}-${packed[2]}-${packed[3]}` : normalized;
    const match = source.match(rocYear ? /^(\d{3})-(\d{2})-(\d{2})$/ : /^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const year = Number(match[1]) + (rocYear ? 1911 : 0);
    const date = new Date(year, Number(match[2]) - 1, Number(match[3]));
    return date.getFullYear() === year && date.getMonth() === Number(match[2]) - 1 && date.getDate() === Number(match[3]) ? date : null;
  };
  const lunarForSolar = (value, rocYear = false) => {
    const date = solarDate(value, rocYear);
    if (!date) return null;
    const parts = new Intl.DateTimeFormat('zh-TW-u-ca-chinese', { year: 'numeric', month: 'long', day: 'numeric' }).formatToParts(date);
    const get = type => parts.find(part => part.type === type)?.value || '';
    const lunarYear = Number(get('relatedYear') || get('year'));
    const monthText = get('month');
    const month = monthMap[String(monthText).replace('閏', '').replace('月', '')];
    const day = Number(String(get('day')).replace(/\D/g, ''));
    if (!Number.isFinite(lunarYear) || !month || !day) return null;
    const cycle = get('yearName') || `${stems[(lunarYear - 4) % 10]}${branches[(lunarYear - 4) % 12]}`;
    return { cycle, month, day, leap: String(monthText).includes('閏'), text: `${cycle}年農${String(monthText).includes('閏') ? '閏' : ''}${month}/${day}` };
  };
  const parseLunar = value => {
    const text = String(value || '').replace(/\s/g, '');
    const byCycle = text.match(/^([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])年?(?:農)?(閏?)(\d{1,2})[\/_月](\d{1,2})$/);
    if (byCycle) return { cycle: byCycle[1], leap: Boolean(byCycle[2]), month: Number(byCycle[3]), day: Number(byCycle[4]) };
    const byYear = text.match(/^(\d{4})年?(?:農)?(閏?)(\d{1,2})[\/_月](\d{1,2})$/);
    return byYear ? { year: Number(byYear[1]), leap: Boolean(byYear[2]), month: Number(byYear[3]), day: Number(byYear[4]) } : null;
  };
  const fromLunar = value => {
    const wanted = parseLunar(value);
    if (!wanted || wanted.month < 1 || wanted.month > 12 || wanted.day < 1 || wanted.day > 30) return null;
    // 依輸入的天干地支先縮小到同一個六十甲子年份，避免每次輸入都掃描兩百多年日期。
    const candidateYears = wanted.lunarYear
      ? [wanted.lunarYear - 1, wanted.lunarYear, wanted.lunarYear + 1]
      : wanted.cycle
        ? Array.from({ length: 201 }, (_, index) => index + 1900)
          .filter(year => `${stems[(year - 4) % 10]}${branches[(year - 4) % 12]}` === wanted.cycle)
        : [];
    for (const year of candidateYears.filter(year => year >= 1900 && year <= 2100)) {
      for (let offset = 0; offset <= 430; offset += 1) {
        const date = new Date(year, 0, 1 + offset);
        const info = lunarForSolar(date);
        if (!info || info.month !== wanted.month || info.day !== wanted.day || info.leap !== wanted.leap) continue;
        if (wanted.cycle && info.cycle !== wanted.cycle) continue;
        if (wanted.year && Number(new Intl.DateTimeFormat('zh-TW-u-ca-chinese', { year: 'numeric' }).formatToParts(date).find(part => part.type === 'relatedYear')?.value) !== wanted.year) continue;
        return date;
      }
    }
    return null;
  };
  const refreshLabel = input => {
    const base = labels[input.name];
    const field = input.closest('.field');
    const label = field?.querySelector(':scope > label');
    const info = lunarForSolar(input.value, true);
    const lunarOutput = field?.querySelector(`[data-lunar-for="${input.name}"]`);
    if (lunarOutput) {
      lunarOutput.value = info?.text || '';
      if (label && base) label.textContent = base;
    } else if (label && base) {
      label.textContent = info ? `${base}（${info.text}）` : base;
    }
  };
  const refreshAllLabels = () => Object.keys(labels).forEach(name => {
    const input = document.querySelector(`#basic input[name="${name}"]`);
    if (input) refreshLabel(input);
  });
  Object.keys(labels).forEach(name => {
    const input = document.querySelector(`#basic input[name="${name}"]`);
    if (!input || input.dataset.lunarTwoWay === 'true') return;
    input.dataset.lunarTwoWay = 'true';
    const convertLunarInput = () => {
      const value = input.value.trim();
      if (!value || solarDate(value, true)) { refreshLabel(input); return; }
      const result = fromLunar(value);
      if (!result) return;
      const year = String(result.getFullYear() - 1911).padStart(3, '0');
      input.value = `${year}/${String(result.getMonth() + 1).padStart(2, '0')}/${String(result.getDate()).padStart(2, '0')}`;
      refreshLabel(input);
      input.dispatchEvent(new Event('change', { bubbles: true }));
    };
    input.addEventListener('blur', convertLunarInput);
    input.addEventListener('change', convertLunarInput);
    input.addEventListener('input', () => { if (solarDate(input.value, true)) refreshLabel(input); });
  });
  window.refreshBasicLunarDates = refreshAllLabels;
  refreshAllLabels();
})();
