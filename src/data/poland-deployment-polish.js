"use strict";
// Regional anchors are intentionally broad; they are not headquarters coordinates.
const polandPolishDeployment = (() => {
  const campaign={title:'U.S. Military Intelligence, The German Campaign in Poland (1942), pp. 6–8',url:'https://www.ibiblio.org/hyperwar/Germany/DA-Poland/DA-Poland.html'};
  const archive={title:'Polish Institute and Sikorski Museum, Armia Pomorze account, B.I.25/A',url:'https://pism.org.uk/img/archiwum/dokumenty/B/B_I_025a.pdf'};
  const narew={title:'IPN Białystok, Działania wojenne w kampanii wrześniowej 1939',url:'https://bialystok.ipn.gov.pl/download/79/235978/Material2.pdf'};
  const group={title:'Polish Army, 1 September 1939, formation assignments',url:'https://www.generalstaff.org/NAF/Pt_I_1939-1940/939pipa.pdf'};
  const wielkopolska={title:'J.S. Tym, Wielkopolska Brigade deployment 1 September 1939',url:'https://cejsh.icm.edu.pl/cejsh/element/bwmeta1.element.desklight-289fea4a-542d-45f1-aeb1-73e98d7939c4/c/BTiP_2017_3_33_kart_Tym.pdf'};
  const anchors={};
  function add(ids,lon,lat,place,radiusKm,bearing,sources,inferenceBasis){for(const id of ids) anchors[id]={lon,lat,place,radiusKm,bearing,sources,inferenceBasis:inferenceBasis+' 地图中心仅为大范围参考，不是精确单位或司令部坐标。'};}
  add(['pl-modlin'],20.3841,53.11278,'姆瓦瓦—莫德林方向',65,180,[campaign,group],'由莫德林集团军活动方向推定集团军所属区域，不表示司令部驻地。');
  add(['pl-narew'],22.07,53.18,'纳雷夫河—比布扎河地区',90,90,[narew,group],'IPN记载该集团军级集群开战前完成防御部署，中心代表整个防区。');
  add(['pl-prusy'],20.4,51.4,'彼得库夫—拉多姆预备集结区',120,90,[campaign,group],'战前美军研究将第3、12、13、19、29师列于罗兹至拉多姆纵深；集团军仍在集结，不代表完整到位。');
  add(['pl-go-east','pl-real-div-4','pl-real-div-16'],18.85,53.49,'格鲁琼兹—奥萨河方向',45,90,[campaign,group],'美国战时研究将第4、16师与波美拉尼亚部队列在格鲁琼兹—托伦地区；东部集群隶属据编制汇编，位置只取共同防区。');
  add(['pl-go-czersk','pl-real-div-9','pl-real-div-15','pl-real-div-27','pl-real-cav-pomorska'],18.0,53.47,'波美拉尼亚走廊—比得哥什地区',95,0,[campaign,archive,group],'战时研究仅将这些部队总体置于走廊、比得哥什及格鲁琼兹一带；第27师转移未完成，参考点不证明它已到托伦。');
  add(['pl-real-div-14','pl-real-div-17','pl-real-div-25','pl-real-div-26','pl-real-cav-podolska'],17.25,52.05,'波兹南—卡利什地区',100,0,[campaign,group],'战时研究将相关部队列于波兹南—卡利什宽大地域；点位是集团军区域推定，不代表各师旅精确分布。');
  add(['pl-real-cav-wielkopolska'],16.8,51.9,'莱什诺—谢雷姆—雅罗钦防区',45,90,[wielkopolska,group],'1939年9月1日部署图显示该旅分布于莱什诺、谢雷姆、雅罗钦等方向。');
  add(['pl-go-piotrkow','pl-real-div-2','pl-real-div-10','pl-real-div-28','pl-real-div-30','pl-real-cav-kresowa'],19.25,51.3,'维隆—谢拉兹—彼得库夫地区',100,0,[campaign,group],'按战时研究罗兹集群作战纵深和编制汇总的隶属关系推定宽大区域；不声称具体师旅驻地。');
  add(['pl-go-slask','pl-go-bielsko','pl-real-div-21','pl-real-div-23','pl-real-div-55','pl-real-cav-krakowska'],19.1,50.0,'卡托维兹—切申—克拉科夫防区',100,0,[campaign,group],'战时研究将克拉科夫方向兵力置于上西里西亚和喀尔巴阡北麓；按隶属推定防区而非总部地点。');
  add(['pl-real-div-18','pl-real-div-33','pl-real-cav-podlaska','pl-real-cav-suwalska'],22.3,53.35,'纳雷夫河—比布扎河—苏瓦乌基防区',100,0,[narew,group],'IPN记载集群已在纳雷夫防线就位；根据单位归属赋予共同大区，预备第33师集中状态仍有不确定性。');
  add(['pl-real-div-3','pl-real-div-12','pl-real-div-13','pl-real-div-19','pl-real-div-29','pl-real-cav-wilenska'],20.35,51.4,'彼得库夫—拉多姆预备集结方向',110,0,[campaign,group],'战时研究将这些师置于罗兹至拉多姆纵深，维尔诺骑兵旅仅依据预备集团军隶属宽泛推定；动员和运输未完成。');
  // The original US Army official map reproduces a German situation map. Its
  // dashed symbols are estimates, not verified positions or proof of arrival.
  const map7={title:'US Army, German Campaign in Poland, Map 7: German dispositions 0445, 1 September 1939',url:'https://www.ibiblio.org/hyperwar/USA/DAP-Poland/maps/Campaign-7.jpg'};
  const mapSymbols=[
    [14,16.627,51.993,'莱什诺—波兹南西南'],[17,17.262,51.851,'波兹南东南—卡利什以西'],
    [25,17.883,51.650,'卡利什附近'],[26,16.965,52.687,'波兹南以北'],
    [2,18.649,51.492,'卡利什—罗兹之间'],[28,19.038,51.020,'拉多姆斯科以西'],[30,18.958,50.912,'琴斯托霍瓦以北'],
    [18,21.814,53.166,'沃姆扎—维兹纳地区'],
    [3,19.986,50.994,'拉多姆斯科以东'],[12,21.239,51.225,'拉多姆以东'],[13,18.729,51.108,'维隆—拉多姆斯科方向'],
    [19,19.754,51.497,'罗兹东南'],[29,19.680,51.320,'彼得库夫地区']
  ];
  for(const [number,lon,lat,place] of mapSymbols){const entry=anchors[`pl-real-div-${number}`];
    Object.assign(entry,{lon,lat,place,radiusKm:50,sources:[...entry.sources,map7],
      inferenceBasis:'据美军官方战史第7图所载德国1939年9月1日态势图中波军虚线番号，按地图粗略转换为地域中心；德国情报可能有误或把预定位置当作实际位置，不能证明师部或整师已到位。半径仅为低置信宽泛区域。'});
  }
  const excluded={
    'pl-real-div-11':'原拟配属但9月1日未到达，尚无可靠开战日集结地域。',
    'pl-real-div-22':'第22师转运及集团军隶属时间有歧见，未确定9月1日实际位置。',
    'pl-real-div-36':'预备师尚在动员，未核实开战日集结地域。',
    'pl-real-mountain-brig-2':'尚未核实9月1日整个旅的区域部署。',
    'pl-real-mountain-brig-3':'尚未核实9月1日整个旅的区域部署。'
  };
  return {anchors,excluded,sources:[campaign,archive,narew,group,wielkopolska,map7]};
})();
