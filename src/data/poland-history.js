"use strict";

// Town coordinates are geographic reference points, not precise HQ sites.
const polandHistoricalScenario = (() => {
  const us = {title:'美国陆军《德国入侵波兰战役》，初始部署',url:'https://www.ibiblio.org/hyperwar/Germany/DA-Poland/DA-Poland.html'};
  const campaign = {title:'美国陆军《1939年德国波兰战役》',url:'https://www.ibiblio.org/hyperwar/USA/DAP-Poland/Campaign-II.html'};
  const geo = id => `https://www.geonames.org/${id}/`;
  const records = {
    'de-okh': {place:'柏林附近',timeNote:'初始部署；具体日期和总部位置待核实',sources:[us]},
    'de-north': {place:'Połczyn-Zdrój（Bad Polzin）',lon:16.09574,lat:53.76424,geoSource:geo(3088477),timeNote:'初始部署；具体时刻未注明',sources:[us,campaign]},
    'de-south': {place:'Nysa（Neisse）',lon:17.33437,lat:50.47379,geoSource:geo(3090436),timeNote:'初始部署；具体时刻未注明',sources:[us,campaign]},
    'de-3': {place:'Morąg（Mohrungen）',lon:19.92602,lat:53.91711,geoSource:geo(3091462),timeNote:'初始部署；具体时刻未注明',sources:[us,campaign]},
    'de-4': {place:'Jastrowie（Jastrow）',lon:16.81756,lat:53.42048,geoSource:geo(3097420),timeNote:'初始部署；具体时刻未注明',sources:[us,campaign]},
    'de-8': {place:'Wrocław（Breslau）',lon:17.03006,lat:51.10286,geoSource:geo(3081368),timeNote:'初始部署；具体时刻未注明',sources:[us,campaign]},
    'de-10': {place:'Opole（Oppeln）',lon:17.92604,lat:50.67119,geoSource:geo(3090048),timeNote:'初始部署；具体时刻未注明',sources:[us,campaign]},
    'de-14': {place:'Nový Jičín（Neutitschein）',lon:18.01028,lat:49.59438,geoSource:geo(3069305),timeNote:'初始部署；具体时刻未注明',sources:[us,campaign]},
    'pl-high': {place:'Warszawa（华沙）',lon:21.01178,lat:52.22977,geoSource:geo(756135),timeNote:'初始部署；具体时刻未注明',sources:[us]},
    'pl-pomorze': {place:'Toruń（托伦）',lon:18.59814,lat:53.01375,geoSource:geo(3083271),timeNote:'1939年8月31日夜至9月1日，Fort XIII；以城市代表点显示',sources:[{title:'托伦 PTTK：1939年9月1日',url:'https://pttk.torun.pl/2012_09_01_ZTT-text.htm'}]},
    'pl-poznan': {place:'Gniezno（格涅兹诺）',lon:17.58259,lat:52.53481,geoSource:geo(3099112),timeNote:'1939年9月1日前后',sources:[{title:'Przegląd Zachodni：1939年作战记述',url:'https://archiwumpz.iz.poznan.pl/Content/4938/C_II_472-C_II_473BP-1972_1-01.pdf'}]},
    'pl-lodz': {place:'Łódź（罗兹，Julianów）',lon:19.47395,lat:51.77058,geoSource:geo(3093133),timeNote:'1939年9月1日；Julianów 总部以罗兹城市代表点显示',sources:[{title:'《瓦尔塔河战斗》档案目录：9月1日 Julianów 报告',url:'https://www.tetragon.com.pl/wp-content/uploads/2021/01/Tetragon-10-DP-tom-1-spis-i-wstep.pdf'}]},
    'pl-krakow': {place:'Kraków（克拉科夫）',lon:19.93658,lat:50.06143,geoSource:geo(3094802),timeNote:'1939年9月1日前后；城市代表点',sources:[{title:'波兰国家记忆研究院：克拉科夫集团军出征',url:'https://1wrzesnia39.pl/39p/artykuly/51187,Armia-Krakow-idzie-na-wojne.html'}]},
    'pl-karpaty': {place:'Rzeszów（热舒夫）',lon:21.99901,lat:50.04132,geoSource:geo(759734),timeNote:'战争初期驻热舒夫；9月1日具体时刻与总部建筑待复核',sources:[{title:'地方历史研究：1939年9月热舒夫地区航空行动',url:'https://www.podkarpackahistoria.pl/artykul/707,wrzesien-1939-dzialania-lotnicze-na-rzeszowszczyznie'}]},
    'pl-modlin': {place:'待定位',timeNote:'1939年9月1日总部地点待核实',sources:[]},
    'pl-narew': {place:'待定位',timeNote:'1939年9月1日总部地点待核实',sources:[{title:'波兰政府教育资料：1939年9月1日部队',url:'https://zpe.gov.pl/a/sprawdz-sie/D18GDUBj0'}]},
    'pl-prusy': {place:'待定位',timeNote:'9月1日中午移至 Skierniewice；此前位置待核实',sources:[{title:'彼得库夫战役',url:'https://iwa.magnum-x.pl/artykul/bitwapodpiotrkowem'}]}
  };
  const commands = [
    ['de-okh',null,'德国陆军最高统帅部（OKH）','none','german','highCommand'],
    ['de-north','de-okh','北方集团军群','armyGroup','german'],['de-south','de-okh','南方集团军群','armyGroup','german'],
    ['de-3','de-north','德军第3集团军','fieldArmy','german'],['de-4','de-north','德军第4集团军','fieldArmy','german'],
    ['de-8','de-south','德军第8集团军','fieldArmy','german'],['de-10','de-south','德军第10集团军','fieldArmy','german'],['de-14','de-south','德军第14集团军','fieldArmy','german'],
    ['pl-high',null,'波兰最高统帅部','none','polish','highCommand'],
    ['pl-pomorze','pl-high','波美拉尼亚集团军','fieldArmy','polish'],['pl-poznan','pl-high','波兹南集团军','fieldArmy','polish'],['pl-lodz','pl-high','罗兹集团军','fieldArmy','polish'],
    ['pl-krakow','pl-high','克拉科夫集团军','fieldArmy','polish'],['pl-karpaty','pl-high','喀尔巴阡集团军','fieldArmy','polish'],['pl-modlin','pl-high','莫德林集团军','fieldArmy','polish'],
    ['pl-narew','pl-high','纳雷夫独立作战集群','none','polish','operationalGroup'],['pl-prusy','pl-high','普鲁士集团军','fieldArmy','polish']
  ];
  const units = commands.map(([id,parent,name,rank,side,commandCategory]) => {
    const unit={id,parent,name,rank,side,commandCategory};
    const record = records[unit.id];
    const located = Number.isFinite(record.lon) && Number.isFinite(record.lat);
    return {id:unit.id,parent:unit.parent,name:unit.name,rank:unit.rank,...(unit.commandCategory?{commandCategory:unit.commandCategory}:{}),
      side:unit.side,type:'headquarters',personnel:0,officers:0,personnelKnown:false,historical:true,
      lon:located?record.lon:null,lat:located?record.lat:null,
      positionAccuracy:located?'city':'unlocated',positionBasis:located?'史料所载城镇的现代地名代表点，非总部精确位置':'总部地点或具体时刻待核实',...record};
  });
  return {id:'poland-1939-historical-hq',revision:'historical-oob-2',title:'1939年9月1日：德波陆军编制与部署',date:'1939-09-01',
    description:'真实番号与来源支持的指挥关系，补到军、师、旅、团。城镇点与作战地域点不是全单位或总部的精确位置；推断单独标记，待定位仍保留指挥链。动员编制、计划归属与实际到位有区别，详见节点说明。并非全部参战部队的完整序列。',
    coverage:[polandGermanOob.coverage,polandPolishOob.coverage],
    defaultExpanded:units.map(unit=>unit.id),bounds:{west:12,east:30,south:47.5,north:56},
    sources:[...new Map([us,campaign,...Object.values(records).flatMap(record=>record.sources),...polandGermanOob.sources,...polandPolishOob.sources].map(source=>[source.url,source])).values()],units:[...units,...polandGermanOob.units,...polandPolishOob.units]};
})();
