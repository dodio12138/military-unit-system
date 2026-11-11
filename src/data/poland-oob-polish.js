"use strict";
// Sources record mobilization and assigned organization, not verified unit positions.
const polandPolishOob = (() => {
  const army = {title:'Polish Army, 1 September 1939 (Zaloga/Madej compilation)',url:'https://www.generalstaff.org/NAF/Pt_I_1939-1940/939pipa.pdf'};
  const regular = {title:'Niehorster: mobilized regular infantry divisions, 1 September 1939',url:'https://niehorster.org/029_poland/organizations/div-inf.html'};
  const reserve = {title:'Niehorster: mobilized reserve infantry divisions, 1 September 1939',url:'https://niehorster.org/029_poland/organizations/div-res.html'};
  const cavalry = {title:'Niehorster: mobilized cavalry brigades, 1 September 1939',url:'https://www.niehorster.org/029_poland/organizations/brig_cav.html'};
  const field = {title:'Polish Army Field Units, September 1939',url:'https://www.generalstaff.org/NAF/Pt_I_1939-1940/939pxph.pdf'};
  const official = {title:'US Army: The German Campaign in Poland, Part II',url:'https://www.ibiblio.org/hyperwar/USA/DAP-Poland/Campaign-II.html'};
  const units=[];
  function add(id,parent,name,rank,type,sources,extra={}) {
    units.push({id,parent,name,rank,type,side:'polish',personnel:0,officers:0,personnelKnown:false,historical:true,
      lon:null,lat:null,positionAccuracy:'unlocated',positionBasis:'尚未核实1939年9月1日的位置',place:'',timeNote:'',sources,...extra});
  }
  // Operational groups are named wartime commands, not corps.
  const groups=[['east','pl-pomorze','东部作战集群'],['czersk','pl-pomorze','切尔斯克作战集群'],['slask','pl-krakow','西里西亚作战集群'],['bielsko','pl-krakow','别尔斯科作战集群'],['piotrkow','pl-lodz','彼得库夫作战集群']];
  for(const [id,parent,name] of groups) add(`pl-go-${id}`,parent,name,'none','general',[army],{commandCategory:'operationalGroup'});
  // Divisional regiments are individually transcribed from the source tables.
  const divisions=[
    [4,'pl-go-east',[14,63,67]], [16,'pl-go-east',[64,65,66]], [9,'pl-pomorze',[22,34,35]], [15,'pl-pomorze',[59,61,62]], [27,'pl-pomorze',[23,24,50]],
    [14,'pl-poznan',[55,57,58]], [17,'pl-poznan',[68,69,70]], [25,'pl-poznan',[29,56,60]], [26,'pl-poznan',[10,18,37]],
    [30,'pl-go-piotrkow',[82,83,84]], [2,'pl-lodz',[2,3,4]], [10,'pl-lodz',[28,30,31]], [28,'pl-lodz',[15,36,72]],
    [6,'pl-go-bielsko',[12,16,20]], [7,'pl-krakow',[25,27,74]], [23,'pl-go-slask',[11,73,75]],
    [21,'pl-go-bielsko',['3m','4m','202r']], [11,'pl-krakow',[48,49,53],'原拟配属，但开战时未能抵达该司令部。'],
    [8,'pl-modlin',[13,21,32]], [20,'pl-modlin',[78,79,80]],
    [18,'pl-narew',[33,42,71]], [33,'pl-narew',[133,134,135],'预备师；动员与集中未必于9月1日完成。',32],
    [19,'pl-prusy',[77,85,86],'预备集团军动员集中中；并非表示全部单位已到位。'], [3,'pl-prusy',[7,8,9],'预备集团军动员集中中；并非表示全部单位已到位。'],
    [12,'pl-prusy',[51,52,54],'预备集团军动员集中中；并非表示全部单位已到位。'], [13,'pl-prusy',[43,44,45],'预备集团军动员集中中；并非表示全部单位已到位。'], [29,'pl-prusy',[41,76,81],'预备集团军动员集中中；并非表示全部单位已到位。'],
    [36,'pl-prusy',[163,164,165],'预备师；动员与集中未必于9月1日完成。',40],
    [55,'pl-go-slask',[201,203,204],'预备师；战时编组与集中状态待进一步核实。',65],
    [22,'pl-high',['2m','5m','6m'],'预定塔尔努夫预备队；来源对集团军归属及交接时间有歧见，开战时未确认到位。']
  ];
  for(const [n,parent,regs,note='',reserveArt] of divisions){
    const id=`pl-real-div-${n}`, isReserve=Boolean(reserveArt), src=isReserve?reserve:regular;
    add(id,parent,`第${n}${isReserve?'预备':''}${n===21||n===22?'山地':''}步兵师`,'division','infantry',[army,src],{timeNote:note,organizationStatus: n===22 || n===11 ? 'planned' : 'documented', organizationBasis:'动员编制表；不意味着全部单位9月1日均在师部附近。'});
    for(const reg of regs){ const label=String(reg); const num=label.replace(/[mr]/g,''); const kind=label.endsWith('m')?'波德哈莱步枪':label.endsWith('r')||isReserve?'预备步兵':'步兵';
      add(`${id}-reg-${label}`,id,`第${num}${kind}团`,'regiment','infantry',[src],{timeNote:note}); }
    add(`${id}-art`,id,`第${reserveArt||n}${isReserve?'预备':''}轻炮兵团`,'regiment','artillery',[src],{timeNote:note});
  }
  const brigades=[
    ['pomorska','pl-go-czersk','波美拉尼亚',[['2','轻骑兵'],['8','骑马步枪'],['16','枪骑兵'],['18','枪骑兵']]],
    ['wielkopolska','pl-poznan','大波兰',[['7','骑马步枪'],['15','枪骑兵'],['17','枪骑兵']]],
    ['podolska','pl-poznan','波多利亚',[['6','枪骑兵'],['9','枪骑兵'],['14','枪骑兵']]],
    ['wolynska','pl-go-piotrkow','沃伦',[['2','骑马步枪'],['12','枪骑兵'],['19','枪骑兵'],['21','枪骑兵']]],
    ['kresowa','pl-lodz','克雷索瓦',[['6','骑马步枪'],['20','枪骑兵'],['22','枪骑兵']]],
    ['krakowska','pl-krakow','克拉科夫',[['3','枪骑兵'],['5','骑马步枪'],['8','枪骑兵']]],
    ['nowogrodzka','pl-modlin','诺沃格鲁德克',[['4','骑马步枪'],['25','枪骑兵'],['26','枪骑兵'],['27','枪骑兵']]],
    ['mazowiecka','pl-modlin','马佐夫舍',[['1','轻骑兵'],['7','枪骑兵'],['11','枪骑兵']]],
    ['podlaska','pl-narew','波德拉谢',[['5','枪骑兵'],['9','骑马步枪'],['10','枪骑兵']]],
    ['suwalska','pl-narew','苏瓦乌基',[['1','枪骑兵'],['2','枪骑兵'],['3','轻骑兵'],['3','骑马步枪']]],
    ['wilenska','pl-prusy','维尔诺',[['4','枪骑兵'],['13','枪骑兵'],['23','枪骑兵']]]
  ];
  for(const [key,parent,name,regs] of brigades){ const id=`pl-real-cav-${key}`;
    add(id,parent,`${name}骑兵旅`,'brigade','cavalry',[army,cavalry],{timeNote:key==='wilenska'?'预备集团军集中中。':'',organizationBasis:'骑兵团规模约相当于营；苏瓦乌基旅第3骑马步枪团为战役开始时配属。'});
    regs.forEach(([num,kind],i)=>add(`${id}-reg-${i+1}`,id,`第${num}${kind}团`,'regiment','cavalry',[cavalry],{timeNote:key==='suwalska'&&num==='3'&&kind==='骑马步枪'?'原属诺沃格鲁德克旅，战役开始时配属苏瓦乌基旅。':''}));
  }
  for (const [n,regs] of [[2,['第1波德哈莱步枪团','第1边防军团“喀尔巴阡”']],[3,['第2边防军团“喀尔巴阡”']]]) {
    const id=`pl-real-mountain-brig-${n}`;add(id,'pl-karpaty',`第${n}山地旅`,'brigade','infantry',[field]);
    regs.forEach((name,i)=>add(`${id}-reg-${i+1}`,id,name,'regiment','infantry',[field]));
  }
  const maczek={title:'IPN Bulletin 6/2022, p. 29: 10th Cavalry Brigade',url:'https://archiwum.ipn.gov.pl/download/1/938209/BIULETYN62022.pdf'};
  const mountain={title:'Radłów municipal historical bulletin, 2023: 1st Mountain Brigade',url:'https://www.gminaradlow.pl/pro_radlow/zasoby/files/radlo/2023-3.pdf'};
  add('pl-real-motor-10','pl-krakow','第10摩托化骑兵旅','brigade','motorized',[army,maczek]);
  add('pl-real-motor-10-reg-24','pl-real-motor-10','第24枪骑兵团','regiment','motorized',[maczek]);
  add('pl-real-motor-10-reg-10','pl-real-motor-10','第10骑马步枪团','regiment','motorized',[maczek]);
  add('pl-real-mountain-brig-1','pl-go-bielsko','第1山地旅','brigade','infantry',[mountain]);
  add('pl-real-mountain-brig-1-reg-2','pl-real-mountain-brig-1','第2边防军步兵团（第2山地步枪团）','regiment','infantry',[mountain,{title:'Museum study: 1st Mountain Brigade and KOP regiments',url:'https://muzn.pl/wp-content/uploads/2022/12/ee4812f7-30_a-jednak-wojna.pdf'}],{organizationBasis:'第2边防军步兵团又称第2山地步枪团；与第22师第2波德哈莱步枪团是不同单位。'});
  const positions = [
    ['pl-real-div-20','Mława',20.3841,53.11278,'764634','https://www.mlawa.pl/vcontent_print/node/23825','市政府：第20师于9月1日防御姆瓦瓦地区。'],
    ['pl-real-div-8','Mława',20.3841,53.11278,'764634','https://www.polska-zbrojna.pl/home/articleshow/20555','军方刊物将第8师列为姆瓦瓦地区兵力；范围较宽。'],
    ['pl-real-cav-nowogrodzka','Mława',20.3841,53.11278,'764634','https://www.polska-zbrojna.pl/home/articleshow/20555','军方刊物将该旅列为姆瓦瓦地区兵力；范围较宽。'],
    ['pl-real-cav-mazowiecka','Mława',20.3841,53.11278,'764634','https://www.polska-zbrojna.pl/home/articleshow/20555','军方刊物将该旅列为姆瓦瓦地区兵力；范围较宽。'],
    ['pl-real-div-7','Częstochowa',19.12409,50.79646,'3100946','https://katowice.ipn.gov.pl/pl3/aktualnosci/75688,Otwarcie-wystawy-7-Dywizja-Piechoty-Zapomniani-bohaterowie-1939-Czestochowa-31-s.html','IPN：9月1日师属分遣队在琴斯托霍瓦方向多地作战；中心仅为区域参考。'],
    ['pl-real-cav-wolynska','Mokra',18.91775,50.96874,'3091514','https://ipn.gov.pl/pl/aktualnosci/2393,Obchody-69-rocznicy-bitwy-pod-Mokra-Mokra-31-sierpnia-2008-r.html','IPN：该旅9月1日在莫克拉作战。'],
    ['pl-real-div-6','Pszczyna',18.95382,49.98037,'3087705','https://ckziumragowo.pl/historia/6%20Dywizja-Piechoty-w-II-RP','公立学校历史资料：第6师在普什奇纳周围数十公里防御带。'],
    ['pl-real-motor-10','Jordanów',19.82981,49.64935,'3097107',maczek.url,'IPN期刊第29页：9月1日投入别斯基德及约旦努夫方向战斗。'],
    ['pl-real-mountain-brig-1','Węgierska Górka',19.11638,49.60776,'3082510',mountain.url,'地方史刊：该旅在别斯基德防区，9月1日遭攻击；参考温吉尔斯卡古尔卡。']
  ];
  for(const [id,place,lon,lat,geoId,url,basis] of positions){const u=units.find(x=>x.id===id);Object.assign(u,{place,lon,lat,positionAccuracy:'area',positionBasis:`${basis} 仅表示作战区域参考点，非指挥部或全体人员位置。`,geoSource:`https://www.geonames.org/${geoId}/`,sources:[...u.sources,{title:'开战日作战区域依据',url}]});}
  const reg24=units.find(u=>u.id==='pl-real-motor-10-reg-24');Object.assign(reg24,{place:'Jordanów',lon:19.82981,lat:49.64935,positionAccuracy:'inferred',positionBasis:'约旦努夫地区参考点，并非精确团部位置。',inferenceBasis:'IPN记载该团9月1日在Jordanów和Wysoka附近交战，取Jordanów作区域参考。',geoSource:'https://www.geonames.org/3097107/',sources:[...reg24.sources,{title:'IPN：第24枪骑兵团',url:'https://ipn.gov.pl/pl/aktualnosci/236398,Upamietnilismy-zolnierzy-24-Pulku-Ulanow-im-Hetmana-Stanislawa-Zolkiewskiego.html'}]});
  for(const u of units) if(!u.organizationStatus) u.organizationStatus = u.id==='pl-real-cav-suwalska-reg-4'?'attached':'documented';
  return {units,sources:[army,regular,reserve,cavalry,field,official],coverage:'波兰8个既有战役司令部主要师、骑兵旅及已核查团级番号；不包含全部直属部队，动员编制不等于开战时实际到位。精确驻地资料仍不完整。'};
})();
