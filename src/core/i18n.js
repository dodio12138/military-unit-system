"use strict";

// Chinese is the source language: UI strings and built-in data are written in
// Chinese and used as lookup keys. English is the default display language.
const languageKey = "military-unit-system:language";
const supportedLanguages = ["en", "zh"];
const language = (() => {
  try {
    const stored = localStorage.getItem(languageKey);
    if (supportedLanguages.includes(stored)) return stored;
  } catch { /* Storage unavailable: fall back to the default. */ }
  return "en";
})();
const english = language === "en";

function setLanguage(next) {
  if (!supportedLanguages.includes(next) || next === language) return;
  try { localStorage.setItem(languageKey, next); } catch { /* Keep the current page language. */ }
  location.reload();
}

const plural = (count, one, many = `${one}s`) => (Number(count) === 1 ? one : many);
const formatParam = (value) => (typeof value === "number" ? value.toLocaleString(english ? "en-US" : "zh-CN") : value ?? "");

// Interface strings. Values may be functions of the raw parameters.
const uiMessages = {
  "兵牌编辑器 · 编制工作台": "Unit Symbol Editor · Order of Battle Workbench",
  "兵牌编辑器": "Unit Symbol Editor",
  "{title} · 兵牌编辑器": "{title} · Unit Symbol Editor",
  "新建编制": "New chart",
  "返回编制": "Back to chart",
  "保存预设": "Save preset",
  "编制列表": "Charts",
  "本机编制": "Charts on this device",
  "整理布局": "Tidy layout",
  "保存图片": "Save image",
  "编制图": "Order of battle",
  "展开一层": "Expand level",
  "叠起一层": "Collapse level",
  "全部展开": "Expand all",
  "叠放同类": "Stack alike",
  "平面": "Flat",
  "放下第一枚兵牌": "Place your first unit",
  "从预设拖入兵牌，开始搭建编制": "Drag a symbol in from the presets to start building",
  "空格": "Space",
  "平移画布": "Pan canvas",
  "缩小": "Zoom out",
  "放大": "Zoom in",
  "已保存在此浏览器": "Saved in this browser",
  "兵牌预设": "Presets",
  "单位属性": "Unit properties",
  "预设库": "Preset library",
  "管理预设": "Manage presets",
  "拖动兵牌到画布，或点击后放置": "Drag onto the canvas, or click then place",
  "编制预设": "Formations",
  "兵种兵牌": "Symbols",
  "放置方式": "Placement",
  "放到空白处": "Drop on empty space",
  "建立独立单位": "Creates a standalone unit",
  "放到已有兵牌上": "Drop onto a unit",
  "编入该单位的下级": "Adds it as a subordinate",
  "在编制图上选择一个单位": "Select a unit on the chart",
  "单位名称": "Unit name",
  "兵种": "Branch",
  "编制级别": "Echelon",
  "上级单位": "Parent unit",
  "单位自身人数": "Unit's own strength",
  "编辑本部人员": "Edit HQ staff",
  "锁定展开状态": "Lock expansion",
  "删除单位": "Delete unit",
  "创建一份独立的空白编制，可在编制列表中切换": "Create a blank chart. Switch between charts from the chart list.",
  "编制名称": "Chart name",
  "取消": "Cancel",
  "创建编制": "Create chart",
  "本部岗位独立计员，下辖单位的人数另计": "HQ posts are counted separately from subordinate units.",
  "岗位": "Post",
  "人数": "Count",
  "军官": "Officers",
  "添加岗位": "Add post",
  "保存本部人员": "Save HQ staff",
  "删除": "Delete",
  "兵牌预设管理": "Preset manager",
  "编辑基础模板": "Edit base templates",
  "整套编制": "Complete charts",
  "预设名称": "Preset name",
  "关闭": "Close",
  "保存当前编制": "Save current chart",
  "编辑编制预设": "Edit formation preset",
  "选择预设": "Preset",
  "打开编制图": "Open as chart",
  "名称": "Name",
  "兵牌图形": "Symbol",
  "用途分类": "Purpose",
  "单件装备（乘员配置在这枚兵牌内）": "Single equipment item (crew is set on this symbol)",
  "下级组成": "Subordinates",
  "选择已有预设并填写数量": "Choose existing presets and set quantities",
  "添加下级": "Add subordinate",
  "编辑历史": "Edit history",
  "撤销": "Undo",
  "撤销（⌘ / Ctrl + Z）": "Undo (⌘ / Ctrl + Z)",
  "重做": "Redo",
  "重做（⌘ / Ctrl + Shift + Z）": "Redo (⌘ / Ctrl + Shift + Z)",
  "已保存的编制": "Saved charts",
  "重命名编制": "Rename chart",
  "下载当前编制图为 SVG": "Download this chart as SVG",
  "编制画布": "Chart canvas",
  "编制层级操作": "Echelon controls",
  "兵牌视图": "Symbol view",
  "画布工具": "Canvas tools",
  "选择工具": "Select tool",
  "选择工具（V）": "Select tool (V)",
  "平移画布（H，或按住空格）": "Pan canvas (H, or hold Space)",
  "可编辑编制图": "Editable order of battle",
  "画布缩放": "Canvas zoom",
  "适应画布": "Fit to canvas",
  "适应画布（F）": "Fit to canvas (F)",
  "兵牌与单位属性": "Symbols and unit properties",
  "编制面板": "Chart panels",
  "预设类别": "Preset category",
  "上级可由下级汇总": "Parents can sum their subordinates",
  "未命名编制": "Untitled chart",
  "如最小指挥战斗单位": "e.g. smallest command unit",
  "基层单位必填，上级可由下级汇总": "Required for base units; parents can sum subordinates",
  "语言": "Language",
  "，": ", ",
  "{name} {count} {unit}": "{count} × {name}",
  "切换到中文": "切换到中文",
  "切换到英文": "Switch to English",

  "预设草稿": "Preset draft",
  "此编制已被删除": "This chart was deleted",
  "浏览器存储不可用": "Browser storage unavailable",
  "{n} 人": (p) => `${formatParam(p.n)} ${plural(p.n, "person", "personnel")}`,
  "待定员": "Strength not set",
  "已录入 {strength}": "Recorded {strength}",
  "{strength}（含推定）": "{strength} (incl. estimates)",
  "{count} 个{name}": "{count} × {name}",
  "{count} 个直属下级": (p) => `${formatParam(p.count)} direct ${plural(p.count, "subordinate")}`,
  "推定 {strength}": "Est. {strength}",
  "已展开 {count} 枚兵牌": (p) => `Unstacked ${formatParam(p.count)} ${plural(p.count, "symbol")}`,
  "已叠放 {count} 枚同类兵牌": (p) => `Stacked ${formatParam(p.count)} matching ${plural(p.count, "symbol")}`,
  "已展开{name}的下级": "Expanded subordinates of {name}",
  "已收起{name}的下级": "Collapsed subordinates of {name}",
  "已叠起一层": "Collapsed one level",
  "这一层单位较多，请分支展开": "This level is large. Expand one branch at a time.",
  "已展开一层": "Expanded one level",
  "已展开全部层级": "Expanded all levels",
  "各分支当前末层没有可叠放的同类单位": "No matching units at the end of any branch to stack",
  "已叠放 {count} 组同类单位": (p) => `Stacked ${formatParam(p.count)} ${plural(p.count, "group")} of matching units`,
  "{rank}级": "{rank}",
  "{count} 枚叠牌": (p) => `${formatParam(p.count)} stacked ${plural(p.count, "symbol")}`,
  "展开已锁定": "Expansion locked",
  "已导出当前编制图": "Exported the current chart",
  "预设编制图": "Preset chart",
  "装备编成与定员示例 · 逐层展开查看装备和乘员": "Equipment and crew example · expand level by level to see equipment and crews",
  "编制示例": "Organization example",
  "1938年春初建序列 · 点击支队兵牌展开 · 补充编成与员额为示例": "Initial order of battle, spring 1938 · click a detachment to expand · supplementary composition and strength are illustrative",
  "1937年改编初期 · 点击师级兵牌展开 · 补充编成与员额为示例": "Shortly after reorganization in 1937 · click a division to expand · supplementary composition and strength are illustrative",
  "1937年8月改编序列 · 下级编成与员额为示例": "Order of battle at reorganization, August 1937 · subordinate composition and strength are illustrative",
  "参考图结构 · 补充编制与员额为示例": "Reference structure · supplementary organization and strength are illustrative",
  "国民革命军第八路军": "Eighth Route Army, National Revolutionary Army",
  "第八路军 · 示例编制": "Eighth Route Army · example chart",
  "自建编制": "Custom chart",
  "{size} 个单位 · {depth} 层编制": (p) => `${formatParam(p.size)} ${plural(p.size, "unit")} · ${formatParam(p.depth)} ${plural(p.depth, "level")}`,
  " · 折叠 {hidden} 个": " · {hidden} folded",
  "编制较大，请逐层展开": "Large chart. Expand level by level.",
  "展开未锁定的编制和叠牌": "Expand unlocked units and stacks",
  "无上级（独立单位）": "None (standalone unit)",
  "编制人数 {strength}": "Authorized strength {strength}",
  "{total} · 军官 {officers}": "{total} · {officers}",
  "{n} 名军官": (p) => `${formatParam(p.n)} ${plural(p.n, "officer")}`,
  "填写固定人数": "Enter a fixed strength",
  "已录 {count} 项主要岗位": (p) => `${formatParam(p.count)} key ${plural(p.count, "post")} recorded`,
  "乘员 {strength} · 军官 {officers}": "Crew {strength} · {officers}",
  "本部 {strength} · 军官 {officers}": "HQ {strength} · {officers}",
  "下辖 {strength} · 军官 {officers}": "Subordinates {strength} · {officers}",
  "编辑乘员": "Edit crew",
  "解除展开锁定": "Unlock expansion",
  "上级已锁定展开": "Locked by a parent",
  "保留此分支当前的展开、折叠和叠牌状态": "Keep this branch's current expanded, folded and stacked state",
  "展开下级": "Expand subordinates",
  "收起下级": "Collapse subordinates",
  "展开叠牌": "Unstack",
  "叠放同类兵牌（{count} 枚）": "Stack matching symbols ({count})",
  "下级单位将转接至该单位的上级": "Subordinates will move to this unit's parent",
  "单位": "Unit",
  "叠牌": "Stack",
  "{count} 枚 · 下方为单枚兵牌数据": (p) => `${formatParam(p.count)} ${plural(p.count, "symbol")} · figures below are per symbol`,
  "装备": "Equipment",
  "组成": "Composition",
  "本部人员": "HQ staff",
  "本部岗位": "HQ posts",
  "已录 {count} 项，不计入员额": (p) => `${formatParam(p.count)} ${plural(p.count, "post")} recorded, not counted in strength`,
  "下辖人员": "Subordinate personnel",
  "乘员": "Crew",
  "定员说明": "Staffing note",
  "示例定员，可按型号修改": "Illustrative crew; adjust for the specific model",
  "合计人数": "Total strength",
  "主要岗位": "Key posts",
  "{role} {count}人": "{role} ×{count}",
  "、": ", ",
  "展开状态": "Expansion",
  "已锁定": "Locked",
  "{name}快捷操作": "{name} actions",
  "点按画布放置{name} · Esc 取消": "Click the canvas to place {name} · Esc to cancel",
  "拖动画布查看下方单位": "Drag the canvas to see more units",
  "滚动查看下方单位": "Scroll to see more units",
  "拖动空白处平移": "Drag empty space to pan",
  "单件装备的人员请通过“编辑乘员”配置": "Set personnel for single equipment items with “Edit crew”",
  "请先补齐预设的下级组成和固定人数": "Complete the preset's subordinates and fixed strengths first",
  "已将{name}编入{parent}": "Added {name} under {parent}",
  "已放置{name}": "Placed {name}",
  "上级至少要保留一个下级单位": "A parent must keep at least one subordinate",
  "单件装备使用机组级别，请选择装备兵种": "Single equipment items use the crew echelon. Choose an equipment branch.",
  "基层单位需要固定的正整数人数": "Base units need a fixed whole-number strength",
  "已删除{name}": "Deleted {name}",
  "不能将单位编入自身的下级": "A unit cannot be placed under its own subordinate",
  "自定义": "Custom",
  "拖入兵牌时带上该级别的基础编制": "Dropped symbols bring that echelon's base organization",
  "{count} 份": (p) => `${formatParam(p.count)} ${plural(p.count, "preset")}`,
  "{count} 枚": (p) => `${formatParam(p.count)} ${plural(p.count, "symbol")}`,
  "{count} 份编制": (p) => `${formatParam(p.count)} ${plural(p.count, "chart")}`,
  "1 {unit} · 乘员 {strength}": "1 {unit} · crew {strength}",
  "已解除{name}的展开锁定": "Unlocked expansion of {name}",
  "已锁定{name}的展开状态": "Locked expansion of {name}",
  "史料示例 · ": "Historical example · ",
  "补全示例 · ": "Completed example · ",
  "原图示例 · ": "Reference example · ",
  "分级示例 · ": "Graded example · ",
  "{kind}{size} 个单位": (p) => `${p.kind}${formatParam(p.size)} ${plural(p.size, "unit")}`,
  "删除编制：{title}": "Delete chart: {title}",
  "编制": "chart",
  "已切换到{title}": "Switched to {title}",
  "删除{kind}": "Delete {kind}",
  "确定删除「{title}」？": "Delete “{title}”?",
  "浏览器未能保存删除操作": "The browser could not save the deletion",
  "已删除编制": "Chart deleted",
  "浏览器未能保存预设": "The browser could not save the preset",
  "内置 · {size} 个单位": (p) => `Built-in · ${formatParam(p.size)} ${plural(p.size, "unit")}`,
  "自定义 · {size} 个单位": (p) => `Custom · ${formatParam(p.size)} ${plural(p.size, "unit")}`,
  "使用": "Use",
  "使用预设：{title}": "Use preset: {title}",
  "已从预设新建{title}": "Created {title} from a preset",
  "编辑": "Edit",
  "编辑预设：{title}": "Edit preset: {title}",
  "删除预设：{title}": "Delete preset: {title}",
  "预设": "preset",
  "已删除预设": "Preset deleted",
  "请先在画布上搭建编制": "Build a chart on the canvas first",
  "单件装备须配置固定乘员岗位，不能包含下级单位": "Single equipment items need fixed crew posts and cannot have subordinates",
  "请先补齐编制里的固定人数": "Fill in the fixed strengths in the chart first",
  "请先补齐编制里的固定人数和下级组成": "Fill in the chart's fixed strengths and subordinates first",
  "基础模板须有一个顶级单位，请把独立单位编入同一上级": "A base template needs a single top unit. Place standalone units under one parent.",
  "预设已保存": "Preset saved",
  "请填写预设名称": "Enter a preset name",
  "已保存整套预设{title}": "Saved complete preset {title}",
  "请输入有效的固定人数": "Enter a valid fixed strength",
  "岗位人数": "Post count",
  "计为军官": "Counts as officer",
  "移除此岗位": "Remove this post",
  "{name} · 乘员配置": "{name} · crew",
  "{name} · 本部人员": "{name} · HQ staff",
  "配置这一辆车或这一门炮的操作人员，按岗位合计人数；默认岗位为可修改示例": "Set the crew for this vehicle or gun; strength is the sum of posts. Default posts are editable examples.",
  "保存乘员": "Save crew",
  "请填写至少一个岗位，人数为正整数，合计不超过 9,999,999 人": "Add at least one post with a whole-number count, 9,999,999 in total at most",
  "下级预设": "Subordinate preset",
  "选择下级预设": "Choose a subordinate preset",
  "下级数量": "Quantity",
  "移除此下级": "Remove this subordinate",
  "新建预设": "New preset",
  "上级预设必须包含下级组成，基层单位必须填写固定人数": "Parent presets need subordinates; base units need a fixed strength",
  "嵌套规模过大，请减少下级数量": "Nesting is too large. Reduce the subordinate quantities.",
  "每种下级预设最多 24 份": "At most 24 of each subordinate preset",
  "已保存预设{name}": "Saved preset {name}",
  "已创建{title}": "Created {title}",
  "已切换到整体 2.5D 视角": "Switched to the 2.5D view",
  "已切换到平面兵牌": "Switched to flat symbols",
  // Custom symbols
  "自定义标识": "Custom symbols",
  "组合北约标识图形，可加入最多 4 个字符的文字。保存后作为新兵种，可用于兵牌、单位属性和预设。": "Combine NATO symbol parts and add up to 4 characters of text. Saved symbols become new branches you can use on the palette, in unit properties and in presets.",
  "如宪兵、无人机": "e.g. Military Police, Drones",
  "文字": "Text",
  "如 MP": "e.g. MP",
  "文字位置": "Text position",
  "居中": "Center",
  "上方": "Top",
  "下方": "Bottom",
  "默认级别": "Default echelon",
  "图形组件": "Symbol parts",
  "删除标识": "Delete symbol",
  "保存标识": "Save symbol",
  "新建标识": "New symbol",
  "编辑标识": "Edit symbol",
  "+ 新建标识": "+ New symbol",
  "编辑标识：{name}": "Edit symbol: {name}",
  "请填写标识名称": "Enter a symbol name",
  "请至少选择一个图形组件或填写文字": "Choose at least one part or enter some text",
  "浏览器未能保存标识": "The browser could not save the symbol",
  "已保存标识{name}": "Saved symbol {name}",
  "标识": "symbol",
  "已删除标识": "Symbol deleted",
  // Help
  "使用说明": "Help",
  "搭建编制": "Building a chart",
  "从右侧「兵牌预设」拖动兵牌到画布，或点击后再点画布放置；按 Enter 放在画布中央。": "Drag a symbol from Presets onto the canvas, or click it and then click the canvas. Press Enter to place it at the center.",
  "放到空白处建立独立单位，放到已有兵牌上编入它的下级。": "Drop on empty space for a standalone unit, or onto a unit to add it as a subordinate.",
  "「编制预设」带完整的下级编成；「兵种兵牌」只按默认级别带基础编制。": "Formations bring their full subordinate structure; Symbols bring only the base organization for their default echelon.",
  "选中兵牌后在「单位属性」中修改名称、兵种、级别和上级。": "Select a unit to change its name, branch, echelon and parent under Unit properties.",
  "拖动兵牌调整位置；拖到另一枚兵牌上则改编为它的下级。": "Drag a unit to move it; drop it onto another unit to reassign it as a subordinate.",
  "展开、折叠与叠牌": "Expanding, folding and stacking",
  "大型编制默认折叠。用「展开一层」「叠起一层」「全部展开」逐层查看，或在单位属性中展开某一分支。": "Large charts start folded. Use Expand level, Collapse level and Expand all, or expand one branch from Unit properties.",
  "「叠放同类」把同一上级下相同的单位叠成一枚兵牌；选中叠牌后可在单位属性中展开。": "Stack alike combines identical units under the same parent into one symbol. Select a stack to unstack it from Unit properties.",
  "「锁定展开状态」会保留该分支当前的展开、折叠和叠牌，不受整体操作影响。": "Lock expansion keeps a branch's current expanded, folded and stacked state when you use the chart-wide controls.",
  "右键或按菜单键打开兵牌的快捷操作。": "Right-click a unit, or press the context-menu key, for quick actions.",
  "人数与装备": "Strength and equipment",
  "上级人数由下级自动汇总；基层单位需要填写固定人数。": "Parent strength is summed from subordinates. Base units need a fixed strength.",
  "指挥部可编辑本部岗位，岗位人数单独计入。": "Headquarters can list their own staff posts, counted separately.",
  "坦克、火炮、卡车等单件装备的乘员配置在兵牌内，不另建下级。": "Single equipment items such as tanks, guns and trucks carry their crew on the symbol rather than as subordinates.",
  "标有「推定」的人数或编成是估算或示例，不是史料记载。": "Strengths or structures marked Est. are estimates or examples, not recorded figures.",
  "「管理预设」中的整套编制可一键新建为编制，也可编辑；「保存当前编制」把当前图存为整套预设。": "In Manage presets, Use creates a new chart from a complete preset and Edit changes it. Save current chart stores this chart as a complete preset.",
  "右键单击编制预设可编辑它的下级组成和人数，修改只影响之后放置的兵牌。": "Right-click a formation preset to edit its subordinates and strength. Changes apply to units placed afterwards.",
  "在「兵种兵牌」中点击「新建标识」，组合图形组件并加入文字，即可建立新的兵种。": "Under Symbols, click New symbol and combine parts and text to create a new branch.",
  "自定义兵种出现在兵牌库、单位属性和预设的兵种列表中，拖入时按默认级别带基础编制。": "Custom branches appear in the palette and in the branch lists for units and presets. Dropped symbols bring the base organization for their default echelon.",
  "点击兵牌右下角的编辑按钮修改标识；删除后，使用它的单位改为通用兵牌。": "Use the edit button on a custom symbol to change it. Deleting one turns the units that use it into general symbols.",
  "视图、保存与导出": "View, saving and export",
  "「平面」与「2.5D」只改变显示，不修改编制。「整理布局」重新排列兵牌。": "Flat and 2.5D only change the view, not the chart. Tidy layout rearranges the symbols.",
  "「保存图片」导出当前可见的编制图为 SVG。": "Save image exports the visible chart as SVG.",
  "所有编制、预设和自定义标识只保存在当前浏览器中，清除浏览器数据会丢失。": "Charts, presets and custom symbols are stored only in this browser. Clearing browser data removes them.",
  "快捷键": "Keyboard shortcuts",
  "平移工具": "Pan tool",
  "按住临时平移": "Hold to pan",
  "删除选中单位": "Delete selected unit",
  "取消放置": "Cancel placement",

  "预设不能直接或间接引用自身": "A preset cannot include itself, directly or indirectly",
  "有下级预设已不存在": "A subordinate preset no longer exists",
};

function t(key, params = {}) {
  const value = english && Object.hasOwn(uiMessages, key) ? uiMessages[key] : key;
  if (typeof value === "function") return value(params);
  return value.replace(/\{(\w+)\}/g, (match, name) => (name in params ? formatParam(params[name]) : match));
}

// Data vocabulary: built-in preset, branch, echelon, post and example names.
const dataTerms = {
  // Branches and symbol groups
  "通用": "General", "步兵": "Infantry", "独立步兵": "Independent Infantry", "骑兵": "Cavalry", "炮兵": "Artillery",
  "工兵": "Engineer", "反坦克": "Anti-Tank", "指挥部": "Headquarters", "辎重": "Transport", "通信": "Signal", "医疗": "Medical",
  "盾形标记": "Shield Mark", "特务": "Special Service", "教导": "Training", "坦克": "Tank", "卡车": "Truck",
  "装甲步兵": "Armored Infantry", "摩托化步兵": "Motorized Infantry", "装甲侦察": "Armored Reconnaissance",
  "突击炮": "Assault Gun", "自行火炮": "Self-Propelled Artillery", "警卫": "Guard", "侦察": "Reconnaissance",
  "勤务": "Service", "卫生": "Medical", "补充": "Replacement", "直属": "Direct Support", "野战炮兵": "Field Artillery",
  "军需": "Quartermaster", "野战补充": "Field Replacement",
  "空降步兵": "Airborne Infantry", "山地步兵": "Mountain Infantry", "两栖步兵": "Amphibious Infantry",
  "特种部队": "Special Forces", "迫击炮": "Mortar", "火箭炮兵": "Rocket Artillery", "防空": "Air Defense", "补给": "Supply",
  "维修": "Maintenance", "宪兵": "Military Police", "防化": "CBRN Defense", "火力与防空": "Fires and air defense",
  "步兵交叉": "Infantry cross", "装甲履带": "Armor", "侦察斜线": "Recon slash", "炮兵圆点": "Artillery dot",
  "反坦克倒V": "Anti-tank V", "通信闪电": "Signal bolt", "医疗十字": "Medical cross", "摩托化车轮": "Wheels",
  "空降翼": "Airborne wings", "山地三角": "Mountain", "两栖波浪": "Amphibious wave", "防空弧顶": "Air defense dome",
  "火箭": "Rocket", "维修扳手": "Maintenance", "补给底线": "Supply bar", "运输车轮": "Transport wheel", "炮管": "Gun",
  "指挥横线": "HQ bar", "教导星": "Training star", "盾形": "Shield",
  "作战单位": "Combat arms", "装甲与机动": "Armor and mobile", "运输装备": "Transport", "指挥与保障": "Command and support",
  // Echelons
  "无级别标记": "No echelon mark", "火力小组／机组": "Fire team / crew", "班／基层队": "Squad", "小队": "Section",
  "排": "Platoon", "连": "Company", "营": "Battalion", "团": "Regiment", "旅": "Brigade", "师": "Division", "军": "Corps",
  "野战集团军": "Field Army", "集团军群": "Army Group", "战区": "Theater", "班": "Squad",
  // Equipment
  "电台": "Radio", "部": "set", "辆": "vehicle", "火炮": "Gun", "门": "gun", "装甲侦察车": "Armored Car",
  // Crew and staff posts
  "报务员": "Radio Operator", "机务员": "Radio Technician", "车长": "Commander", "炮长": "Gunner", "装填手": "Loader",
  "驾驶员": "Driver", "无线电员": "Radio Operator", "瞄准手": "Layer", "弹药手": "Ammunition Handler", "副驾驶员": "Co-driver",
  "炮手": "Gunner", "指挥官": "Commander", "通信员": "Messenger", "文书": "Clerk", "排长": "Platoon Leader",
  "排士官": "Platoon Sergeant", "连长": "Company Commander", "副连长": "Executive Officer", "连士官长": "First Sergeant",
  "军需员": "Supply Sergeant", "营长": "Battalion Commander", "副营长": "Deputy Battalion Commander",
  "团长": "Regimental Commander", "副团长": "Deputy Regimental Commander", "旅长": "Brigade Commander",
  "副旅长": "Deputy Brigade Commander", "师长": "Division Commander", "副师长": "Assistant Division Commander",
  "军长": "Corps Commander", "副军长": "Deputy Corps Commander", "司令员": "Commander", "副司令员": "Deputy Commander",
  "参谋长": "Chief of Staff", "作战参谋": "Operations Officer", "情报参谋": "Intelligence Officer",
  "后勤参谋": "Logistics Officer", "勤务员": "Orderly", "指挥与参谋": "Command and staff", "通信与勤务": "Signal and service",
  "副参谋长": "Deputy Chief of Staff", "参谋": "Staff Officer", "主任": "Director", "副主任": "Deputy Director",
  "干事": "Officer", "教官": "Instructor", "筹办": "Organizer", "站长": "Depot Chief", "总指挥": "Commander-in-Chief",
  "副总指挥": "Deputy Commander-in-Chief", "政治部主任": "Director, Political Department",
  "政治部副主任": "Deputy Director, Political Department", "校长": "Commandant", "政治委员": "Political Commissar",
  "炮兵指挥官": "Artillery Commander", "操作乘员": "Crew", "本部人员": "HQ staff",
  // Built-in presets
  "火力小组": "Fire Team", "机组": "Crew", "基层队": "Basic Squad", "小队（基层队）": "Section (squads)",
  "步兵营": "Infantry Battalion", "排部": "Platoon HQ", "连部": "Company HQ", "营部": "Battalion HQ", "团部": "Regiment HQ",
  "旅部": "Brigade HQ", "师部": "Division HQ", "军部": "Corps HQ", "集团军司令部": "Army HQ",
  "集团军群司令部": "Army Group HQ", "战区司令部": "Theater HQ", "警卫营部": "Guard Battalion HQ",
  "机关警卫队": "HQ Guard Detachment", "军团": "Army Corps",
  "步兵连编制": "Infantry Company", "步兵营编制": "Infantry Battalion", "炮兵营编制": "Artillery Battalion",
  "辎重营编制": "Transport Battalion", "军团编制": "Army Corps", "步兵连编制示例": "Infantry Company Example",
  "步兵营编制示例": "Infantry Battalion Example",
  "最小战斗单位": "Smallest combat unit", "最小操作单位": "Smallest operating unit", "最小指挥战斗单位": "Smallest command unit",
  "基层战斗分队": "Basic combat element", "战斗分队": "Combat element", "基层单位": "Basic unit", "战术单位": "Tactical unit",
  "战术编队": "Tactical formation", "战役编队": "Operational formation", "战役指挥层级": "Operational command level",
  "战略指挥层级": "Strategic command level", "步兵分队": "Infantry element", "步兵单位": "Infantry unit",
  "警卫分队": "Guard element", "机关警卫": "HQ guard", "警卫单位": "Guard unit", "机动分队": "Mobile element",
  "机动单位": "Mobile unit", "指挥与勤务 · 示例定员": "Command and service · illustrative staffing",
  "单件装备 · 示例定员，可按型号修改": "Single equipment item · illustrative crew, adjust for the model",
  "机关警卫分队，按排级推定": "HQ guard element, estimated at platoon size",
  "参照第686团特务连记载，其他团参照推定": "Based on records of the 686th Regiment's special service company; other regiments estimated from it",
  "警卫营下属连，编成与员额为推定": "Company of the guard battalion; composition and strength estimated",
  "第344旅直属警卫营有史料记载，员额与下属编成为推定": "The 344th Brigade's guard battalion is recorded; strength and composition estimated",
  "参照一一五师后期机关警卫的排加班规模，推定改编初期员额": "Estimated from the platoon-plus-squad size of later 115th Division HQ guards",
  "营部警卫 · 推定员额": "Battalion HQ guard · estimated strength",
  "装备编成示例 · 每门炮配一辆牵引卡车": "Equipment example · one tow truck per gun",
  "装备编成示例 · 下辖两个炮兵排": "Equipment example · two artillery platoons",
  "装备编成与定员为示例": "Equipment and staffing are illustrative",
  "汽车运输编成示例 · 下辖三辆卡车": "Motor transport example · three trucks",
  "汽车运输编成示例 · 下辖三个辎重排": "Motor transport example · three transport platoons",
  "汽车运输编成与定员为示例": "Motor transport composition and staffing are illustrative",
  "班组与分队": "Teams and sections", "单件装备与乘员": "Single equipment and crews", "炮兵与运输": "Artillery and transport",
  "指挥机构": "Command elements", "编队与指挥": "Formations and commands",
  "补充编成与定员为示例": "Supplementary composition and staffing are illustrative",
  "基层人员组 · 示例定员": "Basic team · illustrative staffing", "下级编成与定员为示例": "Subordinate composition and staffing are illustrative",
  "下级编成与员额为示例": "Subordinate composition and strength are illustrative",
  "仓储与装卸 · 示例定员": "Storage and handling · illustrative staffing", "电台与操作人员为示例": "Radios and operators are illustrative",
  "师部机关 · 本部员额为示例": "Division HQ · HQ strength is illustrative", "仅录入史料所列主要岗位": "Only key posts named in the sources",
  "宣传组": "Propaganda Team", "修理组": "Repair Team", "医疗组": "Medical Team", "仓储班": "Storage Squad",
  "教导队部": "Training Unit HQ", "学员小队": "Cadet Section",
  // Eighth Route Army
  "八路军": "Eighth Route Army", "八路军总编制": "Eighth Route Army", "总指挥部": "General Headquarters",
  "一一五师": "115th Division", "一二〇师": "120th Division", "一二九师": "129th Division", "独立团": "Independent Regiment",
  "教导团": "Training Regiment", "师部指挥部": "Division Headquarters", "盾形标记营": "Shield-Mark Battalion",
  "总部特务团": "GHQ Special Service Regiment", "总部直属部队，营以下编成及员额为示例": "GHQ troops; composition and strength below battalion are illustrative",
  "总部随营学校": "GHQ Field School", "后方总留守处": "Rear Garrison Headquarters",
  "统一指挥留陕部队，相关部队按原建制列在各师": "Commanded the forces left in Shaanxi; those units are listed under their divisions",
  "朱德": "Zhu De", "彭德怀": "Peng Dehuai", "叶剑英": "Ye Jianying", "左权": "Zuo Quan", "任弼时": "Ren Bishi",
  "邓小平": "Deng Xiaoping", "韦国清": "Wei Guoqing", "张平凯": "Zhang Pingkai", "萧劲光": "Xiao Jinguang",
  // New Fourth Army
  "新四军": "New Fourth Army", "新四军总编制": "New Fourth Army", "国民革命军陆军新编第四军": "New Fourth Army, National Revolutionary Army",
  "司令部": "Headquarters Staff", "政治部": "Political Department", "战地服务团": "Field Service Troupe",
  "第一支队": "1st Detachment", "第二支队": "2nd Detachment", "第三支队": "3rd Detachment", "第四支队": "4th Detachment",
  "支队部": "Detachment HQ", "手枪团": "Pistol Regiment", "传令排": "Messenger Platoon", "学兵连": "Student Company",
  "军部特务营": "Corps HQ Special Service Battalion", "军部教导队": "Corps HQ Training Unit", "总兵站": "Main Supply Depot",
  "按桐柏山独立团改编时的三营记载呈现": "Shown with three battalions, as recorded when the Tongbaishan Independent Regiment was reorganized",
  "三个分队参照方毅1938年任职时的回忆，分队以下编成与员额为示例": "Three teams per Fang Yi's recollection of 1938; composition and strength below are illustrative",
  "由湘南、闽中游击队改编，营以下编成与员额为示例": "Formed from southern Hunan and central Fujian guerrillas; composition and strength below battalion are illustrative",
  "1938年2月开学": "Opened February 1938",
  "叶挺": "Ye Ting", "项英": "Xiang Ying", "张云逸": "Zhang Yunyi", "周子昆": "Zhou Zikun", "袁国平": "Yuan Guoping",
  "邓子恢": "Deng Zihui", "朱克靖": "Zhu Kejing", "陈毅": "Chen Yi", "傅秋涛": "Fu Qiutao", "张正坤": "Zhang Zhengkun",
  "张鼎丞": "Zhang Dingcheng", "粟裕": "Su Yu", "黄火星": "Huang Huoxing", "卢胜": "Lu Sheng", "谭震林": "Tan Zhenlin",
  "饶守坤": "Rao Shoukun", "叶飞": "Ye Fei", "高敬亭": "Gao Jingting", "杨克志": "Yang Kezhi", "曹玉福": "Cao Yufu",
  "周骏鸣": "Zhou Junming", "林恺": "Lin Kai", "顾士多": "Gu Shiduo", "高志荣": "Gao Zhirong", "詹化雨": "Zhan Huayu",
  "汪少川": "Wang Shaochuan", "张元寿": "Zhang Yuanshou",
  // US 1st Infantry Division, June 1944
  "美国陆军第1步兵师": "US Army 1st Infantry Division",
  "1944年6月诺曼底登陆序列 · 点击团级兵牌展开 · 营以下编成与员额为示例": "Normandy landings, June 1944 · click a regiment to expand · composition and strength below battalion are illustrative",
  "1944年6月6日奥马哈海滩登陆时的主要序列": "Main order of battle for the Omaha Beach landing, 6 June 1944",
  "克拉伦斯·R·许布纳少将": "Maj. Gen. Clarence R. Huebner", "威拉德·G·怀曼准将": "Brig. Gen. Willard G. Wyman",
  "斯坦霍普·B·梅森上校": "Col. Stanhope B. Mason", "乔治·A·泰勒上校": "Col. George A. Taylor",
  "小乔治·A·史密斯上校": "Col. George A. Smith Jr.", "约翰·F·R·塞茨上校": "Col. John F. R. Seitz",
  "克利夫特·安德勒斯准将": "Brig. Gen. Clift Andrus",
  "加农炮连": "Cannon Company", "反坦克连": "Antitank Company", "师属炮兵": "Division Artillery",
  "下辖三个105毫米与一个155毫米榴弹炮营": "Three 105 mm and one 155 mm howitzer battalions",
  "第1工兵战斗营": "1st Engineer Combat Battalion", "第1骑兵侦察队": "1st Cavalry Reconnaissance Troop", "机械化": "Mechanized",
  "第701军械轻型维修连": "701st Ordnance Light Maintenance Company",
  // German 1st Infantry Division, September 1939
  "德国陆军第1步兵师": "German Army 1st Infantry Division",
  "1939年9月波兰战役序列 · 点击团级兵牌展开 · 营以下编成与员额为示例": "Polish campaign, September 1939 · click a regiment to expand · composition and strength below battalion are illustrative",
  "1939年9月隶属第3集团军，自东普鲁士出发": "Under 3rd Army in September 1939, attacking from East Prussia",
  "约阿希姆·冯·科茨弗莱施中将": "Generalleutnant Joachim von Kortzfleisch",
  "第13（步兵炮）连": "13th (Infantry Gun) Company", "第14（反坦克）连": "14th (Anti-Tank) Company",
  "三个轻型营装备10.5厘米榴弹炮；按1939年标准另配属一个15厘米重炮营": "Three light battalions with 10.5 cm howitzers; a 15 cm heavy battalion attached per the 1939 establishment",
  "重炮兵营": "Heavy Artillery Battalion", "轻型": "light",
  "第1师补给勤务部队": "1st Divisional Supply Troops", "卫生勤务部队": "Medical Services",
  "1939年动员后组建，编成与员额为示例": "Formed on mobilization in 1939; composition and strength are illustrative",
};

const rankWords = { 班: "Squad", 排: "Platoon", 连: "Company", 营: "Battalion", 团: "Regiment", 旅: "Brigade", 师: "Division",
  军: "Corps", 分队: "Team", 队: "Unit", 排部: "Platoon HQ", 连部: "Company HQ", 营部: "Battalion HQ" };
const branchWords = { 步兵: "Infantry", 骑兵: "Cavalry", 炮兵: "Artillery", 工兵: "Engineer", 辎重: "Transport", 教导: "Training",
  直属: "Direct Support", 特务: "Special Service", 警卫: "Guard", 通信: "Signal", 反坦克: "Anti-Tank", 侦察: "Reconnaissance",
  勤务: "Service", 卫生: "Medical", 补充: "Replacement", 坦克: "Tank", 装甲步兵: "Armored Infantry", 摩托化步兵: "Motorized Infantry",
  装甲侦察: "Armored Reconnaissance", 突击炮: "Assault Gun", 自行火炮: "Self-Propelled Artillery", 野战炮兵: "Field Artillery",
  军需: "Quartermaster", 野战补充: "Field Replacement", 学员: "Cadet", 仓储: "Storage", 空降步兵: "Airborne Infantry",
  山地步兵: "Mountain Infantry", 两栖步兵: "Amphibious Infantry", 特种部队: "Special Forces", 迫击炮: "Mortar",
  火箭炮兵: "Rocket Artillery", 防空: "Air Defense", 补给: "Supply", 维修: "Maintenance", 宪兵: "Military Police",
  防化: "CBRN Defense" };

function ordinal(n) {
  const value = Number(n);
  const suffix = value % 100 >= 11 && value % 100 <= 13 ? "th" : { 1: "st", 2: "nd", 3: "rd" }[value % 10] ?? "th";
  return `${n}${suffix}`;
}

const translatedTerms = new Map();
function translateTerm(text) {
  if (Object.hasOwn(dataTerms, text)) return dataTerms[text];
  if (Object.hasOwn(uiMessages, text) && typeof uiMessages[text] === "string") return uiMessages[text];
  let match;
  if ((match = /^(.+) (\d+)$/.exec(text))) return `${tr(match[1])} ${match[2]}`;
  if ((match = /^第(\d+)(分队|排|连|营|团|旅|师|军)$/.exec(text))) return `${ordinal(match[1])} ${rankWords[match[2]]}`;
  if ((match = /^第(\d+)(.+?)(班|排|连|营|团|旅|师)$/.exec(text)) && branchWords[match[2]]) {
    return `${ordinal(match[1])} ${branchWords[match[2]]} ${rankWords[match[3]]}`;
  }
  if ((match = /^(.+?)（(.+)）$/.exec(text))) return `${tr(match[1])} (${tr(match[2])})`;
  if ((match = /^([\d.]+)(毫米|厘米)(.*)$/.exec(text))) return `${match[1]} ${match[2] === "毫米" ? "mm" : "cm"}${match[3] ? ` ${tr(match[3])}` : ""}`;
  if ((match = /^(.+?)(排部|连部|营部|班|排|连|营|团)$/.exec(text)) && branchWords[match[1]]) {
    return `${branchWords[match[1]]} ${rankWords[match[2]]}`;
  }
  if (/\s/.test(text)) return text.split(/(\s+)/).map((part) => (/\s/.test(part) ? part : tr(part))).join("");
  return text;
}

// Translate built-in data text for display. User-entered text without a known
// translation is returned unchanged; nothing is rewritten in saved charts.
function tr(text) {
  if (!english || typeof text !== "string" || !/[㐀-鿿]/.test(text)) return text;
  if (!translatedTerms.has(text)) translatedTerms.set(text, translateTerm(text));
  return translatedTerms.get(text);
}

// Standard US Army abbreviations for compact places (symbol captions, palette
// details). Full names stay in the inspector, tooltips and accessible labels.
const abbreviations = [
  ["Headquarters", "HQ"], ["Field Artillery", "FA"], ["Self-Propelled", "SP"], ["Reconnaissance", "Recon"],
  ["Special Service", "Spec Svc"], ["Special Forces", "SF"], ["Military Police", "MP"], ["Air Defense", "AD"],
  ["Infantry", "Inf"], ["Battalion", "Bn"], ["Company", "Co"], ["Platoon", "Plt"], ["Regiment", "Regt"],
  ["Brigade", "Bde"], ["Divisional", "Div"], ["Division", "Div"], ["Artillery", "Arty"], ["Engineer", "Engr"],
  ["Cavalry", "Cav"], ["Armored", "Armd"], ["Motorized", "Mot"], ["Anti-Tank", "AT"], ["Antitank", "AT"],
  ["Signal", "Sig"], ["Medical", "Med"], ["Training", "Trng"], ["Detachment", "Det"], ["Squad", "Sqd"],
  ["Section", "Sec"], ["Replacement", "Repl"], ["Maintenance", "Maint"], ["Ordnance", "Ord"],
  ["Quartermaster", "QM"], ["Mechanized", "Mech"], ["Combat", "Cbt"], ["Services", "Svcs"], ["Light", "Lt"],
  ["Heavy", "Hvy"], ["Mountain", "Mtn"], ["Airborne", "Abn"], ["Amphibious", "Amph"], ["Supply", "Sup"], ["Transport", "Trans"],
  ["Troop", "Trp"], ["Rocket", "Rkt"], ["Mortar", "Mort"], ["Theater", "Thtr"],
].map(([full, short]) => [new RegExp(`\\b${full}\\b`, "g"), short]);

// Shorten an English caption when it is longer than `limit` characters.
function brief(text, limit = 18) {
  if (!english || typeof text !== "string" || text.length <= limit) return text;
  return abbreviations.reduce((result, [pattern, short]) => result.replace(pattern, short), text);
}

// Estimated rendered width of a label, in units of one CJK character.
function captionLength(text) {
  return [...text].reduce((sum, char) => sum + (/[　-鿿＀-￯]/.test(char) ? 1 : 0.55), 0);
}

function localizeDocument(root = document.body) {
  document.documentElement.lang = english ? "en" : "zh-CN";
  document.title = t(document.title);
  if (!english) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.nodeValue.trim();
    if (text && Object.hasOwn(uiMessages, text)) node.nodeValue = node.nodeValue.replace(text, t(text));
  }
  for (const element of root.querySelectorAll("[aria-label], [title], [placeholder]")) {
    for (const attribute of ["aria-label", "title", "placeholder"]) {
      const value = element.getAttribute(attribute);
      if (value && Object.hasOwn(uiMessages, value)) element.setAttribute(attribute, t(value));
    }
  }
}
