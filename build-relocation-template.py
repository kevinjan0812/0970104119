from __future__ import annotations

import argparse
import base64
import hashlib
import json
import zipfile
from copy import deepcopy
from pathlib import Path

from lxml import etree


W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
NS = {"w": W_NS}
W = f"{{{W_NS}}}"
XML_SPACE = "{http://www.w3.org/XML/1998/namespace}space"


def first_text_container(element: etree._Element) -> etree._Element:
    paragraph = element if element.tag == f"{W}p" else element.find(".//w:p", NS)
    if paragraph is None:
        paragraph = etree.SubElement(element, f"{W}p")

    texts = paragraph.xpath(".//w:t", namespaces=NS)
    if texts:
        return texts[0]

    run = etree.SubElement(paragraph, f"{W}r")
    return etree.SubElement(run, f"{W}t")


def replace_visible_text(element: etree._Element, value: str) -> None:
    target = first_text_container(element)
    paragraphs = target.xpath("ancestor::w:p[1]", namespaces=NS)
    if not paragraphs:
        raise RuntimeError("找不到範本欄位所屬段落")
    paragraph = paragraphs[0]
    target.text = value
    target.set(XML_SPACE, "preserve")

    seen_target = False
    for text in paragraph.xpath(".//w:t", namespaces=NS):
        if text is target:
            seen_target = True
            continue
        if seen_target or text is not target:
            text.text = ""


def body_paragraphs(root: etree._Element) -> list[etree._Element]:
    return root.xpath("/w:document/w:body/w:p", namespaces=NS)


def body_tables(root: etree._Element) -> list[etree._Element]:
    return root.xpath("/w:document/w:body/w:tbl", namespaces=NS)


def physical_cell(table: etree._Element, row_index: int, cell_index: int) -> etree._Element:
    rows = table.xpath("./w:tr", namespaces=NS)
    cells = rows[row_index].xpath("./w:tc", namespaces=NS)
    return cells[cell_index]


def patch_document_xml(document_xml: bytes) -> bytes:
    parser = etree.XMLParser(remove_blank_text=False)
    root = etree.fromstring(document_xml, parser)
    paragraphs = body_paragraphs(root)
    tables = body_tables(root)
    if len(paragraphs) < 2 or len(tables) < 2:
        raise RuntimeError("遷葬範本結構與預期不符")

    replace_visible_text(paragraphs[0], "案號：{{case_no}}　流程檢核：{{workflow}}")
    replace_visible_text(paragraphs[1], "")

    detail = tables[0]
    replace_visible_text(physical_cell(detail, 0, 1), "{{case_name}}")
    for index, row_index in enumerate(range(1, 4), start=1):
        slot = f"{index:02d}"
        replace_visible_text(physical_cell(detail, row_index, 1), f"{{{{contact_{slot}_name}}}}")
        replace_visible_text(physical_cell(detail, row_index, 3), f"{{{{contact_{slot}_relation}}}}")
        replace_visible_text(physical_cell(detail, row_index, 5), f"{{{{contact_{slot}_phone}}}}")

    detail_slots = {
        (4, 1): "{{date_status}}",
        (4, 3): "{{tower_master}}",
        (5, 1): "{{cemetery_address}}",
        (6, 1): "{{relocation_date}}",
        (6, 3): "{{relocation_time}}",
        (7, 1): "{{remains_handling}}",
        (8, 1): "{{urn_style}}",
        (9, 1): "{{tower_location}}",
        (9, 3): "{{tower_date}}",
        (9, 5): "{{tower_time}}",
        (10, 1): "{{eco_location}}",
        (10, 3): "{{eco_date}}",
        (10, 5): "{{eco_time}}",
        (11, 1): "{{service_history}}",
    }
    for (row_index, cell_index), tag in detail_slots.items():
        replace_visible_text(physical_cell(detail, row_index, cell_index), tag)

    family = tables[1]
    for pair_index in range(6):
        lunar_row = 1 + pair_index * 2
        solar_row = lunar_row + 1
        for person_index, offset in ((pair_index + 1, 0), (pair_index + 7, 4)):
            slot = f"{person_index:02d}"
            replace_visible_text(physical_cell(family, lunar_row, offset), f"{{{{family_{slot}_title}}}}")
            replace_visible_text(physical_cell(family, lunar_row, offset + 1), f"{{{{family_{slot}_name}}}}")
            replace_visible_text(physical_cell(family, lunar_row, offset + 2), f"農：{{{{family_{slot}_lunar}}}}")
            replace_visible_text(physical_cell(family, solar_row, offset + 2), f"國：{{{{family_{slot}_solar}}}}")
            replace_visible_text(physical_cell(family, lunar_row, offset + 3), f"{{{{family_{slot}_fate}}}}")

    return etree.tostring(root, xml_declaration=True, encoding="UTF-8", standalone=True)


def build_template(reference: Path, output: Path) -> None:
    with zipfile.ZipFile(reference, "r") as source:
        original_parts = {info.filename: source.read(info.filename) for info in source.infolist()}
        infos = source.infolist()

    patched_parts = dict(original_parts)
    patched_parts["word/document.xml"] = patch_document_xml(original_parts["word/document.xml"])

    output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output, "w") as destination:
        for info in infos:
            destination.writestr(deepcopy(info), patched_parts[info.filename])

    with zipfile.ZipFile(output, "r") as generated:
        final_parts = {info.filename: generated.read(info.filename) for info in generated.infolist()}
    if original_parts.keys() != final_parts.keys():
        raise RuntimeError("範本套件的檔案清單發生非預期變更")
    changed = [name for name in original_parts if original_parts[name] != final_parts[name]]
    if changed != ["word/document.xml"]:
        raise RuntimeError(f"範本出現非預期變更：{changed}")


def write_template_data(template: Path, output: Path) -> None:
    encoded = base64.b64encode(template.read_bytes()).decode("ascii")
    output.write_text(
        "// Generated by build-relocation-template.py.\n"
        f"window.RELOCATION_WORD_TEMPLATE_BASE64 = {json.dumps(encoded)};\n",
        encoding="utf-8",
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("reference", type=Path)
    parser.add_argument("template", type=Path)
    parser.add_argument("template_data", type=Path)
    args = parser.parse_args()

    build_template(args.reference, args.template)
    write_template_data(args.template, args.template_data)
    digest = hashlib.sha256(args.template.read_bytes()).hexdigest().upper()
    print(f"template={args.template}")
    print(f"sha256={digest}")
    print(f"bytes={args.template.stat().st_size}")


if __name__ == "__main__":
    main()
