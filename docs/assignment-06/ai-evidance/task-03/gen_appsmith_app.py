"""Generate an Appsmith import JSON for the budget check app from the blank export of this Appsmith version."""
import copy
import json
import re
import sys
import uuid
from pathlib import Path

blank_path, js_path, out_path = sys.argv[1:4]
CLOUD = len(sys.argv) > 4 and sys.argv[4] == "cloud"
blank = json.loads(Path(blank_path).read_text())
js_source = Path(js_path).read_text()

# --- JS Object: body as Appsmith stores it (export default {...}) + parsed actions/variables -------------------
body = js_source[js_source.index("export default {"):]


def split_members(src):
    """Split the top-level members of `export default { ... }` (simple brace/string aware scanner)."""
    start = src.index("{") + 1
    depth, i, member_start, members = 0, start, start, []
    in_str = None
    in_regex = False
    while i < len(src):
        c = src[i]
        if in_str:
            if c == "\\":
                i += 2
                continue
            if c == in_str:
                in_str = None
        elif in_regex:
            if c == "\\":
                i += 2
                continue
            if c == "/":
                in_regex = False
        elif src.startswith("//", i):
            i = src.index("\n", i)
            continue
        elif c in "\"'`":
            in_str = c
        elif c == "/" and depth == 0 and re.search(r":\s*$", src[member_start:i]):
            in_regex = True
        elif c in "{([":
            depth += 1
        elif c in "})]":
            if depth == 0:
                members.append(src[member_start:i])
                break
            depth -= 1
        elif c == "," and depth == 0:
            members.append(src[member_start:i])
            member_start = i + 1
        i += 1
    return [m.strip() for m in members if m.strip()]


actions, variables = [], []
for member in split_members(body):
    member = re.sub(r"^(\s*//[^\n]*\n)+", "", member).strip()
    m = re.match(r"(async\s+)?(\w+)\s*\(([^)]*)\)\s*(\{.*\})\s*$", member, re.S)
    if m:
        is_async, name, args, fn_body = m.groups()
        actions.append({
            "name": name,
            "fullyQualifiedName": f"Budget.{name}",
            "pluginType": "JS",
            "pluginId": "js-plugin",
            "actionConfiguration": {
                "timeoutInMillisecond": 10000,
                "paginationType": "NONE",
                "encodeParamsToggle": True,
                "body": f"{'async ' if is_async else ''}function ({args}) {fn_body}",
                "jsArguments": [{"name": a.strip()} for a in args.split(",") if a.strip()],
            },
            "executeOnLoad": False,
            "clientSideExecution": True,
            "dynamicBindingPathList": [{"key": "body"}],
            "isValid": True,
            "invalids": [],
            "messages": [],
            "jsonPathKeys": [],
            "confirmBeforeExecute": False,
            "userPermissions": [],
        })
    else:
        name, value = member.split(":", 1)
        variables.append({"name": name.strip(), "value": value.strip()})

# --- Widgets -----------------------------------------------------------------------------------------------
widgets = []


def widget(kind, name, top, height, props, left=1, width=30, bindings=(), triggers=()):
    w = {
        "widgetName": name,
        "type": kind,
        "widgetId": uuid.uuid4().hex[:10],
        "parentId": "0",
        "renderMode": "CANVAS",
        "isLoading": False,
        "isVisible": True,
        "animateLoading": True,
        "version": 1,
        "leftColumn": left,
        "rightColumn": left + width,
        "topRow": top,
        "bottomRow": top + height,
        "parentColumnSpace": 19.0,
        "parentRowSpace": 10.0,
        "mobileTopRow": top,
        "mobileBottomRow": top + height,
        "mobileLeftColumn": left,
        "mobileRightColumn": left + width,
        "key": uuid.uuid4().hex[:10],
        "dynamicBindingPathList": [{"key": k} for k in bindings],
        "dynamicTriggerPathList": [{"key": k} for k in triggers],
        "dynamicPropertyPathList": [],
    }
    w.update(props)
    widgets.append(w)


def text(name, top, height, value, *, size="1rem", style="", color="#231F20", visible=None, bindings=("text",)):
    props = {
        "text": value, "fontSize": size, "fontStyle": style, "textAlign": "LEFT", "textColor": color,
        "truncateButtonColor": "#553DE9", "overflow": "NONE", "shouldTruncate": False,
        "borderColor": "#E0DEDE", "borderWidth": "0", "dynamicHeight": "FIXED",
        "minDynamicHeight": 4, "maxDynamicHeight": 9000,
    }
    bind = list(bindings)
    if visible:
        props["isVisible"] = visible
        bind.append("isVisible")
    if color.startswith("{{"):
        bind.append("textColor")
    widget("TEXT_WIDGET", name, top, height, props, bindings=[b for b in bind if "{{" in str(props.get(b, ""))])


def input_widget(name, top, label, input_type, placeholder):
    widget("INPUT_WIDGET_V2", name, top, 7, {
        "version": 2, "inputType": input_type, "label": label, "labelPosition": "Top", "labelAlignment": "left",
        "labelWidth": 5, "labelTextSize": "0.875rem", "placeholderText": placeholder, "defaultText": "",
        "isRequired": False, "isDisabled": False, "resetOnSubmit": False, "autoFocus": False, "allowFormatting": False,
        "showStepArrows": False, "iconAlign": "left", "accentColor": "#553DE9", "borderRadius": "0.375rem",
        "boxShadow": "none", "dynamicHeight": "FIXED", "minDynamicHeight": 4, "maxDynamicHeight": 9000,
        "validation": True, "isSpellCheck": False,
    })


VISIBLE_RESULT = "{{!!appsmith.store.budgetResult}}"
R = "appsmith.store.budgetResult"

text("TitleText", 1, 4, "Проверка бюджета", size="1.25rem", style="BOLD")
text("SubtitleText", 5, 4, "Сколько потрачено в категории за месяц" + (" · демо-данные: встроенная копия тестового набора, без бэкенда" if CLOUD else ""), size="0.875rem", color="#71717A")
input_widget("MonthInput", 10, "Месяц", "TEXT", "ГГГГ-ММ")
text("MonthError", 17, 4, '{{appsmith.store.budgetErrors?.month ?? ""}}', size="0.875rem", color="#DC2626")
widget("SELECT_WIDGET", "CategorySelect", 22, 7, {
    "version": 1, "labelText": "Категория", "labelPosition": "Top", "labelAlignment": "left", "labelWidth": 5,
    "labelTextSize": "0.875rem",
    "sourceData": [
        {"label": "Еда", "value": "food"}, {"label": "Транспорт", "value": "transport"},
        {"label": "Развлечения", "value": "entertainment"}, {"label": "Коммунальные услуги", "value": "utilities"},
        {"label": "Другое", "value": "other"},
    ],
    "optionLabel": "label", "optionValue": "value", "defaultOptionValue": "food", "placeholderText": "Категория",
    "isFilterable": False, "serverSideFiltering": False, "isRequired": False, "isDisabled": False,
    "accentColor": "#553DE9", "borderRadius": "0.375rem", "boxShadow": "none", "responsiveBehavior": "fill",
    "dynamicHeight": "FIXED", "minDynamicHeight": 4, "maxDynamicHeight": 9000,
})
input_widget("LimitInput", 30, "Лимит на месяц", "NUMBER", "0.00")
text("LimitError", 37, 4, '{{appsmith.store.budgetErrors?.limit ?? ""}}', size="0.875rem", color="#DC2626")
widget("BUTTON_WIDGET", "CheckButton", 42, 4, {
    "text": "Проверить", "onClick": "{{Budget.check()}}", "buttonColor": "#553DE9", "buttonVariant": "PRIMARY",
    "placement": "CENTER", "isDisabled": False, "isDefaultClickDisabled": True, "recaptchaType": "V3",
    "disabledWhenInvalid": False, "resetFormOnClick": False, "borderRadius": "0.375rem", "boxShadow": "none",
    "widgetName": "CheckButton", "responsiveBehavior": "hug",
}, triggers=("onClick",))
text("ErrorText", 47, 6, "Не удалось проверить бюджет. {{appsmith.store.budgetError}}", size="0.875rem",
     color="#DC2626", visible="{{!!appsmith.store.budgetError}}")
text("ResultHeader", 54, 4, f'{{{{CategorySelect.selectedOptionLabel}}}}, {{{{{R}?.month}}}}', size="0.875rem",
     color="#71717A", visible=VISIBLE_RESULT)
text("StatusText", 58, 4, f"{{{{Budget.STATUSES[{R}?.status]?.label}}}}", style="BOLD",
     color=f"{{{{Budget.STATUSES[{R}?.status]?.color}}}}", visible=VISIBLE_RESULT)
widget("PROGRESS_WIDGET", "UsedProgress", 62, 4, {
    "progressType": "linear", "progress": f"{{{{Math.min({R}?.percent_used ?? 0, 100)}}}}", "showResult": False,
    "steps": 1, "isIndeterminate": False, "fillColor": f"{{{{Budget.STATUSES[{R}?.status]?.color}}}}",
    "counterClockwise": False, "borderRadius": "0.375rem", "isVisible": VISIBLE_RESULT,
}, bindings=("progress", "fillColor", "isVisible"))
text("PercentText", 66, 4, f"Использовано: {{{{Budget.formatPercent({R}?.percent_used ?? 0)}}}}", visible=VISIBLE_RESULT)
text("SpentText", 70, 4, f"Потрачено: {{{{Budget.formatAmount({R}?.spent ?? 0)}}}}", visible=VISIBLE_RESULT)
text("RemainingText", 74, 4, f"Осталось: {{{{Budget.formatAmount({R}?.remaining ?? 0)}}}}", visible=VISIBLE_RESULT)

# --- Assemble the import JSON ------------------------------------------------------------------------------
app = copy.deepcopy(blank)
app["exportedApplication"]["name"] = "Budget check (cloud)" if CLOUD else "Budget check"
app["exportedApplication"]["slug"] = "budget-check-cloud" if CLOUD else "budget-check"
for state in ("unpublishedPage", "publishedPage"):
    dsl = app["pageList"][0][state]["layouts"][0]["dsl"]
    dsl["children"] = copy.deepcopy(widgets)
    dsl["bottomRow"] = 900
    dsl["version"] = 95  # LATEST_DSL_VERSION of this Appsmith build; older versions trigger the x4 grid migration
    dsl["snapColumns"] = 64
    app["pageList"][0][state]["layouts"][0]["layoutOnLoadActions"] = []

rest_action = {
    "name": "GetExpenses",
    "fullyQualifiedName": "GetExpenses",
    "datasource": {
        "name": "DEFAULT_REST_DATASOURCE", "pluginId": "restapi-plugin",
        "datasourceConfiguration": {"url": "http://host.docker.internal:8000"},
        "invalids": [], "messages": [], "isAutoGenerated": False, "deleted": False, "policies": [], "userPermissions": [],
    },
    "pageId": "Page1",
    "actionConfiguration": {
        "timeoutInMillisecond": 10000, "paginationType": "NONE", "path": "/api/expenses",
        "headers": [], "autoGeneratedHeaders": [], "encodeParamsToggle": True,
        "queryParameters": [{"key": "category", "value": "{{CategorySelect.selectedOptionValue}}"}],
        "bodyFormData": [], "httpMethod": "GET", "httpVersion": "HTTP11",
        "pluginSpecifiedTemplates": [{"value": True}], "formData": {"apiContentType": "none"},
    },
    "runBehaviour": "MANUAL", "executeOnLoad": False,
    "dynamicBindingPathList": [{"key": "queryParameters[0].value"}],
    "isValid": True, "invalids": [], "messages": [], "jsonPathKeys": ["CategorySelect.selectedOptionValue"],
    "confirmBeforeExecute": False, "userPermissions": [], "validName": "GetExpenses",
}
app["actionList"] = [] if CLOUD else [{
    "id": "Page1_GetExpenses", "pluginType": "API", "pluginId": "restapi-plugin",
    "unpublishedAction": rest_action, "publishedAction": copy.deepcopy(rest_action),
    "gitSyncId": uuid.uuid4().hex,
}][: 0 if CLOUD else 1]
for js_action in actions:
    unpublished = dict(js_action, pageId="Page1", collectionId="Page1_Budget", runBehaviour="MANUAL")
    app["actionList"].append({
        "id": f"Page1_Budget.{js_action['name']}", "pluginType": "JS", "pluginId": "js-plugin",
        "unpublishedAction": unpublished, "publishedAction": copy.deepcopy(unpublished),
        "gitSyncId": uuid.uuid4().hex,
    })

collection = {
    "name": "Budget", "pageId": "Page1", "pluginId": "js-plugin", "pluginType": "JS",
    "actions": [], "archivedActions": [], "body": body, "variables": variables, "userPermissions": [],
}
app["actionCollectionList"] = [{
    "id": "Page1_Budget", "unpublishedCollection": collection, "publishedCollection": copy.deepcopy(collection),
    "gitSyncId": uuid.uuid4().hex,
}]
Path(out_path).write_text(json.dumps(app, ensure_ascii=False, indent=1))
print(f"widgets={len(widgets)} js_actions={[a['name'] for a in actions]} variables={[v['name'] for v in variables]}")
