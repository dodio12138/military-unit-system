# 德军：1939 年 9 月 1 日编制资料与展示口径

`src/data/poland-oob-german.js` 记录波兰战役德军五个集团军的主要军、师及已核查团级番号，并包含部分集团军群直属、预备和未就绪部队。这是有来源的部分战斗序列，未覆盖全部旅级中间机关、营级分遣、边防部队和直属保障力量。师直接连接团是界面层级简化，不能据此认定历史上不存在旅部。

## 来源与日期

高级隶属基本依据 [Niehorster《German World War II Organizational Series》卷 1/III：Higher Headquarters](https://www.niehorster.org/011_germany/books_gwwii/vol_1-3__30-07-07.pdf)的 1939 年 9 月 1 日表。第一、二波步兵师团级编号取自[卷 1/II-1](https://www.niehorster.org/011_germany/books_gwwii/vol_1-2-1__28-07-07.pdf)第 13、55 页；第三、四波师编号取自[卷 1/II-2](https://www.niehorster.org/011_germany/books_gwwii/vol_1-2-2__28-07-07.pdf)第 13、45 页。机动部队取自[卷 1/I：Mechanized Army Formations and Waffen-SS Formations](https://www.niehorster.org/011_germany/books_gwwii/vol_1-1__28-07-07.pdf)的当日师图及分类表。该卷本文所引页码为**印刷页码**，PDF 阅读器页序另加 4。

[美国陆军《The German Campaign in Poland》](https://www.ibiblio.org/hyperwar/USA/DAP-Poland/Campaign-II.html)用于战役背景，不以战役后期的重新隶属覆盖 9 月 1 日数据。每个单位的 `sources`、`timeNote` 和必要的 `organizationBasis` 保留其具体证据及局限。动员表说明番号和编制，不自动证明全部下属营已到齐、实际兵力或准确驻地。

## 机动部队的高风险番号复核

逐图复核了卷 1/I 中以下具体标记：

| 单位 | 展示番号 | 直接证据及限制 |
| --- | --- | --- |
| 第 1 装甲师炮兵团 | 第 73 摩托化炮兵团 | 印刷第 11 页（PDF 第 15 页）师图炮团旗旁为 **73**。同书印刷第 40 页汇总表却列 **72**；采用具体师图并在单位来源、备注中保留冲突。 |
| 第 3 装甲师炮兵团 | 第 75 摩托化炮兵团 | 印刷第 15 页（PDF 第 19 页）师图炮团旗旁为 **75**。同书第 40 页汇总表却列 **76**；同样采用具体师图。第 1 轻型师的第 76 炮兵团不因此更改。 |
| 第 4 装甲师步枪团 | 第 12 摩托化步枪团 | 印刷第 17 页（PDF 第 21 页）明确标记 **12**，下有第 I、II 营；同图炮团为 **103**。不以师号生成步枪团番号。 |
| 第 3 轻型师 | 第 9 骑兵步枪团、第 8 侦察团 | 印刷第 25 页（PDF 第 29 页）有第 9 团部及原第 8 团的第 I、II 营，未画第 8 骑兵步枪团团部；故不据营番号另造团部。图中的第 8 侦察团是另一单位。 |
| 第 4 轻型师 | 第 10、11 骑兵步枪团，第 9 侦察团，第 102 炮兵团 | 印刷第 27 页（PDF 第 31 页）师图分别列出这些番号。 |

第 10 装甲师仅表示师部及当日临时附属力量。[Niehorster 当日图](https://www.niehorster.org/011_germany/39_organ_army/39_pz-10.html)列第 8 装甲团及由第 29 摩托化步兵师暂附的第 86 摩托化步兵团；不采用后来完整师编制，也不在第 29 师重复计列第 86 团。第 20 摩托化步兵师采用第 56 炮兵团团部番号，不能以其下属轻炮营编号自动改成第 20 炮兵团；卷 1/I 印刷第 61 页区分这些编号。

## 军级隶属有分歧的单位

界面采用下表的显示父级，同时以 `commandStatus:'disputed'`、`alternateParents` 和来源说明保留分歧，**没有**将争议师统一改作集团军直属，也不宣称争议已经解决。[Nafziger 第 10 集团军当日表](https://www.generalstaff.org/NAF/Pt_I_1939-1940/939gxxj.pdf)与 Niehorster 的对应表不一致：

| 单位 | 显示父级（Nafziger） | 保留的另一口径（Niehorster） |
| --- | --- | --- |
| 第 4 装甲师 | 第 XVI 军 | 第 XIV 军 |
| 第 18、19 步兵师 | 第 XI 军 | 第 XIV 军 |
| 第 13、29 摩托化步兵师 | 第 XIV 军 | 第 XI 军 |
| 第 2 轻型师 | 第 XV 军 | 第 10 集团军 |
| 第 1 山地师 | 第 XXII 军 | 第 14 集团军 |
| 第 2 山地师 | 第 XVIII 军 | 第 14 集团军 |

山地师依据另见 [Nafziger 德军陆军 1939 年 9 月 1 日表](https://www.generalstaff.org/NAF/Pt_I_1939-1940/939giaa.pdf)。第 2 山地师的第 136、137 山地步兵团及第 111 山地炮兵团注明仅部分营，不能理解为完整团已在师内。

## 其他例外与未知数据

第 207 步兵师经过独立的第 1 边防区指挥部隶属第 4 集团军。该机关使用 `rank:'none'` 和 `commandCategory:'operationalGroup'` 表示特殊指挥机关，避免创造非法通用等级。第 VII、XXII 军列南方集团军群直属。肯普夫集群为特遣集群，师级显示不表示其正式为师；其第 7 装甲团依据 [Niehorster 当日装甲部队表](https://www.niehorster.org/011_germany/afv-strengths/_afv_39-09-01.htm)。第 16 步兵团为脱离第 22 师的空运部队，列南方集团军群直属。

第 12 步兵师部分步兵营及炮兵营加强第 20 摩托化步兵师，团级树不表示这些营仍全部在原师。第 46 师保留第 115 炮兵团部与第 114 轻炮营的编号区别。第 252、257、258 步兵师注明尚未就绪，不能视为已经部署到前线。第 50 师第 121、122、123 步兵团的[所用记录](https://www.okh.it/units/4division/Inf/0050ID.htm)明确到 9 月 3 日，故仍标记 `commandStatus:'inferred'`，不作为独立核实的 9 月 1 日事实。

人员和军官数为未知；数值零只是数据接口占位，`personnelKnown:false` 才是语义。未经核实的经纬度为空，不把上级所在地传播给下级。第 4 装甲师的 Mokra 参考点依据[波兰国家记忆研究院的当日战斗记录](https://katowice.ipn.gov.pl/pl3/aktualnosci/149690%2CHistoryczny-rajd-motocyklowy-Mokra-Czestochowa-Wreczyca-Wielka-28-sierpnia-2021.html)及 [GeoNames 地名点](https://www.geonames.org/3091514/)，仅表示作战地域，非总部、整师中心或具体时刻位置。
