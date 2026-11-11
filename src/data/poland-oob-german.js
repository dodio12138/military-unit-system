"use strict";

// 1939-09-01 assignments follow Niehorster's dated OOB; numbered infantry
// regiments follow his mobilization tables, not a generated naming template.
const polandGermanOob = (() => {
  const order = {title:'Niehorster，1939年9月1日德军高级编制表，第11页',url:'https://www.niehorster.org/011_germany/books_gwwii/vol_1-3__30-07-07.pdf'};
  const infantry = {title:'Niehorster，1939年第一、二波步兵师编号表，第13、55页',url:'https://www.niehorster.org/011_germany/books_gwwii/vol_1-2-1__28-07-07.pdf'};
  const campaign = {title:'美国陆军战史：波兰战役',url:'https://www.ibiblio.org/hyperwar/USA/DAP-Poland/Campaign-II.html'};
  const units = [];
  function add(id,parent,name,rank,type='general',extra={}) {
    units.push({id,parent,name,rank,type,side:'german',personnel:0,officers:0,personnelKnown:false,historical:true,
      lon:null,lat:null,positionAccuracy:'unlocated',positionBasis:'具体位置尚未核实',place:'待定位',timeNote:'1939年9月1日编制；具体时刻待核实',sources:[order],...extra});
  }
  const corps = [
    ['de-corps-21','de-3','第21军'],['de-corps-1','de-3','第1军'],['de-wodrig','de-3','沃德里希特别指挥部'],
    ['de-corps-3','de-4','第3军'],['de-corps-2','de-4','第2军'],['de-corps-19','de-4','第19摩托化军'],
    ['de-corps-10','de-8','第10军'],['de-corps-13','de-8','第13军'],
    ['de-corps-11','de-10','第11军'],['de-corps-16','de-10','第16摩托化军'],['de-corps-14','de-10','第14摩托化军'],['de-corps-4','de-10','第4军'],['de-corps-15','de-10','第15摩托化军'],
    ['de-corps-8','de-14','第8军'],['de-corps-17','de-14','第17军'],['de-corps-18','de-14','第18军'],
    ['de-corps-7','de-south','第7军（集团军群直属）'],['de-corps-22','de-south','第22军（集团军群直属）']
  ];
  for (const [id,parent,name] of corps) add(id,parent,name,'corps','headquarters');
  // Division number, parent, numbered infantry regiments, artillery regiment.
  // The 12th Division's battalions and artillery battalion partly reinforced 20th Motorized.
  const foot = [
    [1,'de-wodrig',[1,22,43],1],[12,'de-wodrig',[27,48,89],12],
    [11,'de-corps-1',[2,23,44],11],[61,'de-corps-1',[151,162,176],161],
    [21,'de-corps-21',[3,24,45],21],
    [3,'de-corps-2',[8,29,50],3],[32,'de-corps-2',[4,94,96],32],[23,'de-4',[9,67,68],23],
    [24,'de-corps-10',[31,32,102],24],[10,'de-corps-13',[20,41,85],10],[17,'de-corps-13',[21,55,95],17],[30,'de-8',[6,26,46],30],
    [14,'de-corps-16',[11,53,101],14],[31,'de-corps-16',[12,17,82],31],
    [18,'de-corps-14',[30,51,54],18],[19,'de-corps-14',[59,73,74],19],
    [4,'de-corps-4',[10,52,103],4],[46,'de-corps-4',[42,72,97],115],
    [8,'de-corps-8',[28,38,84],8],[28,'de-corps-8',[7,49,83],28],
    [7,'de-corps-17',[19,61,62],7],[44,'de-corps-17',[131,132,134],96],[45,'de-corps-17',[130,133,135],98],
    [27,'de-corps-7',[40,63,91],27],[68,'de-corps-7',[169,188,196],168],[62,'de-corps-22',[164,183,190],162],
    [73,'de-north',[170,186,213],173]
  ];
  for (const [n,parent,regiments,art] of foot) {
    const id=`de-id-${n}`;
    const note=n===12?'动员编制；两个步兵营和一个炮兵营加强第20摩托化步兵师，团级不表示全部在原师':'1939年9月1日编制；团按动员编号表，实际分遣与位置待核查';
    add(id,parent,`第${n}步兵师`,'division','infantry',{timeNote:note});
    for(const num of regiments) add(`${id}-ir-${num}`,id,`第${num}步兵团`,'regiment','infantry',{timeNote:note,sources:[order,infantry]});
    add(`${id}-ar-${art}`,id,`第${art}炮兵团（团部）`,'regiment','artillery',{timeNote:n===46?'第115炮兵团部；轻炮营编号为第114，重炮营为第115团第I营':'动员编制；实际附属营与分遣情况待核查',sources:[order,infantry]});
  }
  add('de-border-1','de-4','第1边防区指挥部','none','headquarters',{commandCategory:'operationalGroup'});
  const other = [
    ['de-id-50','de-corps-3','第50步兵师','infantry'],['de-id-207','de-border-1','第207步兵师','infantry'],
    ['de-id-218','de-4','第218步兵师（集团军直属）','infantry'],['de-id-217','de-3','第217步兵师（集团军直属）','infantry'],['de-id-228','de-corps-21','第228步兵师','infantry'],
    ['de-mid-2','de-corps-19','第2摩托化步兵师','infantry'],['de-mid-20','de-corps-19','第20摩托化步兵师','infantry'],
    ['de-mid-13','de-corps-11','第13摩托化步兵师','infantry'],['de-mid-29','de-corps-11','第29摩托化步兵师','infantry'],
    ['de-pz-3','de-corps-19','第3装甲师','tank'],['de-pz-1','de-corps-16','第1装甲师','tank'],['de-pz-4','de-corps-14','第4装甲师','tank'],
    ['de-pz-5','de-corps-8','第5装甲师','tank'],['de-pz-2','de-corps-18','第2装甲师','tank'],
    ['de-light-1','de-10','第1轻型师（摩托化）','tank'],['de-light-2','de-10','第2轻型师（摩托化）','tank'],['de-light-3','de-corps-15','第3轻型师（摩托化）','tank'],['de-light-4','de-corps-18','第4轻型师（摩托化）','tank'],
    ['de-mtn-1','de-14','第1山地师','infantry'],['de-mtn-2','de-14','第2山地师','infantry'],['de-mtn-3','de-corps-18','第3山地师','infantry'],
    ['de-id-239','de-corps-8','第239步兵师','infantry'],['de-id-213','de-corps-22','第213步兵师','infantry'],['de-id-221','de-corps-22','第221步兵师','infantry'],
    ['de-id-206','de-north','第206步兵师（集团军群直属）','infantry'],['de-id-208','de-north','第208步兵师（集团军群直属）','infantry'],
    ['de-id-252','de-south','第252步兵师（尚未就绪）','infantry'],['de-id-257','de-south','第257步兵师（尚未就绪）','infantry'],['de-id-258','de-south','第258步兵师（尚未就绪）','infantry'],
    ['de-kempf','de-corps-1','肯普夫装甲集群','tank']
  ];
  for(const [id,parent,name,type] of other) add(id,parent,name,'division',type,{timeNote:['de-id-252','de-id-257','de-id-258'].includes(id)?'1939年9月1日尚未完成训练，并非已到位作战部队':'1939年9月1日编制；具体时刻和位置待核查'});
  const mechanized = {title:'Niehorster：1939年9月1日机动部队编制',url:'https://www.niehorster.org/011_germany/books_gwwii/vol_1-1__28-07-07.pdf'};
  const pz10source = {title:'Niehorster：第10装甲师临时附属部队，1939年9月1日',url:'https://www.niehorster.org/011_germany/39_organ_army/39_pz-10.html'};
  add('de-pz-10','de-north','第10装甲师指挥部（陆军最高统帅部预备）','division','tank',{timeNote:'9月1日仅师部及临时附属部队；不是后来完整编成',sources:[mechanized,pz10source]});
  const actualRegiments = [
    ['de-pz-1','第1装甲团','tank','pz-1'],['de-pz-1','第2装甲团','tank','pz-2'],['de-pz-1','第1摩托化步枪团','infantry','rifle-1'],
    ['de-pz-2','第3装甲团','tank','pz-3'],['de-pz-2','第4装甲团','tank','pz-4'],
    ['de-mid-2','第5摩托化步兵团','infantry','ir-5'],['de-mid-2','第25摩托化步兵团','infantry','ir-25'],['de-mid-2','第92摩托化步兵团','infantry','ir-92'],
    ['de-pz-10','第8装甲团（临时附属）','tank','pz-8'],['de-pz-10','第86摩托化步兵团（由第29师临时附属）','infantry','ir-86']
  ];
  const motorSource={title:'1939年摩托化步兵师番号与改编',url:'https://dokumen.pub/world-war-ii-german-motorized-infantry-panzergrenadiers.html'};
  const panzerSource={title:'1939年9月1日第1装甲师战斗序列',url:'https://gregpanzerblitz.com/poland39/1stPanzerSeptember1939.pdf'};
  const pz2Source={title:'第2装甲师1939年9月1日编制',url:'https://erenow.org/ww/2nd-panzer-division-1935-1945/2.php'};
  for(const [parent,name,type,key] of actualRegiments) add(`${parent}-${key}`,parent,name,'regiment',type,{timeNote:'1939年9月1日番号；位置及实际分遣待核查',sources:parent==='de-pz-10'?[pz10source]:parent==='de-mid-2'?[motorSource]:parent==='de-pz-2'?[pz2Source]:[panzerSource]});
  const conflicting={title:'第10集团军1939年9月1日编制（另一口径）',url:'https://www.generalstaff.org/NAF/Pt_I_1939-1940/939gxxj.pdf'};
  // Sources conflict about the immediate corps. Display the Nafziger parent
  // and retain the Niehorster alternative without claiming resolution.
  const disputes = {
    'de-pz-4':['de-corps-16','de-corps-14'], 'de-id-18':['de-corps-11','de-corps-14'],
    'de-id-19':['de-corps-11','de-corps-14'], 'de-mid-13':['de-corps-14','de-corps-11'],
    'de-mid-29':['de-corps-14','de-corps-11'], 'de-light-2':['de-corps-15','de-10']
  };
  for (const [id,[chosen,alternate]] of Object.entries(disputes)) {
    const unit=units.find(u=>u.id===id); unit.parent=chosen; unit.commandStatus='disputed';
    unit.alternateParents=[alternate]; unit.organizationBasis='军级隶属有资料分歧；展示采用 Nafziger 9月1日表，另见 Niehorster';
    unit.timeNote='1939年9月1日军级隶属来源冲突；采用 Nafziger 表显示'; unit.sources=[order,conflicting];
  }
  // Numbers below are transcribed individually from the dated formations and
  // motorized rifle / artillery tables (pp. 12–26, 35, 40, 42, 59, 61).
  const indexed = [
    ['de-pz-2','rifle',2],['de-pz-3','rifle',3],['de-pz-4','rifle',12],['de-pz-5','rifle',13],['de-pz-5','rifle',14],
    ['de-light-1','cavalry',4],['de-light-2','cavalry',6],['de-light-2','cavalry',7],['de-light-3','cavalry',9],['de-light-4','cavalry',10],['de-light-4','cavalry',11],
    ['de-light-2','recon',7],['de-light-3','recon',8],['de-light-4','recon',9],
    ['de-pz-3','tank',5],['de-pz-3','tank',6],['de-pz-4','tank',35],['de-pz-4','tank',36],['de-pz-5','tank',15],['de-pz-5','tank',31],
    ['de-pz-1','art',73],['de-pz-2','art',74],['de-pz-3','art',75],['de-pz-4','art',103],['de-pz-5','art',116],
    ['de-light-1','art',76],['de-light-2','art',78],['de-light-3','art',80],['de-light-4','art',102],
    ['de-mid-2','art',2],['de-mid-13','art',13],['de-mid-20','art',56],['de-mid-29','art',29],
    ['de-mid-13','motor',33],['de-mid-13','motor',66],['de-mid-13','motor',93],
    ['de-mid-20','motor',69],['de-mid-20','motor',76],['de-mid-20','motor',90],
    ['de-mid-29','motor',15],['de-mid-29','motor',71]
  ];
  const labels={rifle:['摩托化步枪团','infantry'],cavalry:['摩托化骑兵步枪团','infantry'],recon:['摩托化侦察团','general'],tank:['装甲团','tank'],art:['摩托化炮兵团','artillery'],motor:['摩托化步兵团','infantry']};
  for (const [parent,kind,num] of indexed) {
    const [label,type]=labels[kind];
    const diagramPage=kind==='art'&&parent==='de-pz-1'?11:kind==='art'&&parent==='de-pz-3'?15:null;
    const sources=diagramPage?[{...mechanized,title:`Niehorster：具体师图印刷第${diagramPage}页（PDF第${diagramPage+4}页）；汇总第40页有番号冲突`}]:[mechanized];
    add(`${parent}-${kind}-${num}`,parent,`第${num}${label}`,'regiment',type,{sources,
      timeNote: diagramPage?'采用具体师图炮团番号；同书第40页汇总表分别误列72／76，地点与分遣待核查':parent==='de-mid-29'?'动员编号；第86摩托化步兵团于9月1日临时附属第10装甲师':'1939年9月1日编制表；实际分遣和地点待核查'});
  }
  const wave={title:'Niehorster 第三、四波步兵师1939年9月1日编号，第13、45页',url:'https://www.niehorster.org/011_germany/books_gwwii/vol_1-2-2__28-07-07.pdf'};
  const waveTable={206:[301,312,413],207:[322,368,374],208:[309,337,338],213:[318,354,406],217:[311,346,389],218:[323,386,397],221:[350,360,375],228:[325,356,400],239:[327,372,444],252:[452,461,472],257:[457,466,477],258:[458,478,479]};
  for(const [num,regiments] of Object.entries(waveTable)) {
    const parent=`de-id-${num}`; const note=Number(num)>=250?'动员番号；师于9月1日尚未就绪，不能视作部队已到前线':'动员番号；实际分遣与位置待核实';
    for(const r of regiments) add(`${parent}-ir-${r}`,parent,`第${r}步兵团`,'regiment','infantry',{sources:[order,wave],timeNote:note});
    add(`${parent}-ar-${num}`,parent,`第${num}炮兵团`,'regiment','artillery',{sources:[order,wave],timeNote:note});
  }
  const mountain={title:'Nafziger，1939年9月1日德军陆军编制',url:'https://www.generalstaff.org/NAF/Pt_I_1939-1940/939giaa.pdf'};
  const mountainTable=[['de-mtn-1','infantry',98],['de-mtn-1','infantry',99],['de-mtn-1','artillery',79],['de-mtn-2','infantry',136],['de-mtn-2','infantry',137],['de-mtn-2','artillery',111],['de-mtn-3','infantry',138],['de-mtn-3','infantry',139],['de-mtn-3','artillery',112]];
  for(const [parent,type,num] of mountainTable) add(`${parent}-${type}-${num}`,parent,`第${num}山地${type==='artillery'?'炮兵':'步兵'}团${parent==='de-mtn-2'?'（部分营）':''}`,'regiment',type,{sources:[mountain],timeNote:parent==='de-mtn-2'?'资料列该团部分营，未证实整个团在师内':'1939年9月1日编制表；实际分遣与位置待核查'});
  for(const [id,chosen] of [['de-mtn-1','de-corps-22'],['de-mtn-2','de-corps-18']]) {
    const unit=units.find(u=>u.id===id);unit.parent=chosen;unit.alternateParents=['de-14'];unit.commandStatus='disputed';
    unit.organizationBasis='军级隶属有资料分歧；展示采用 Nafziger 9月1日表，另见 Niehorster';unit.sources=[order,mountain];
  }
  add('de-kempf-pz-7','de-kempf','第7装甲团','regiment','tank',{sources:[{title:'Niehorster 1939年9月1日装甲部队',url:'https://www.niehorster.org/011_germany/afv-strengths/_afv_39-09-01.htm'}],timeNote:'1939年9月1日附属肯普夫装甲集群'});
  const fifty={title:'第50步兵师战役编成',url:'https://www.okh.it/units/4division/Inf/0050ID.htm'};
  for(const r of [121,122,123]) add(`de-id-50-ir-${r}`,'de-id-50',`第${r}步兵团`,'regiment','infantry',{sources:[fifty],timeNote:'来源明确9月3日三个团；9月1日实际隶属待复核',organizationBasis:'9月3日记录外推，待核实',commandStatus:'inferred'});
  const mokra={title:'波兰国家记忆研究院：莫克拉战斗',url:'https://katowice.ipn.gov.pl/pl3/aktualnosci/149690%2CHistoryczny-rajd-motocyklowy-Mokra-Czestochowa-Wreczyca-Wielka-28-sierpnia-2021.html'};
  Object.assign(units.find(unit=>unit.id==='de-pz-4'),{lon:18.91775,lat:50.96874,positionAccuracy:'area',pointRole:'operational-area',place:'Mokra（莫克拉）附近',positionBasis:'9月1日作战地域参考点，非司令部或整师位置',timeNote:'1939年9月1日莫克拉战斗；军级隶属来源冲突',geoSource:'https://www.geonames.org/3091514/',sources:[order,conflicting,mokra]});
  add('de-ir-16','de-south','第16步兵团（空运，脱离第22师）','regiment','infantry',{timeNote:'9月1日脱离第22师，列南方集团军群直属',sources:[order]});
  return {units,sources:[order,infantry,campaign,mechanized,pz10source,mokra],coverage:'五个集团军主要军、师及已核查的步兵、装甲、摩托化、轻型、山地部队团级番号；非完整战斗序列。营级分遣、旅级中间机关、边防与直属保障部队仍不完整，位置与人员多数未知。'};
})();
