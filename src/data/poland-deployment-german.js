"use strict";

// Approximate georeferencing of the U.S. Army's schematic map 7, not HQ fixes.
const polandGermanDeployment = (() => {
  const map = {title:'美国陆军战史地图7：1939年9月1日04:45德军部署与首日目标',url:'https://www.ibiblio.org/hyperwar/USA/DAP-Poland/maps/Campaign-7.jpg'};
  const narrative = {title:'美国陆军战史：1939年9月1日至3日开战行动',url:'https://www.ibiblio.org/hyperwar/USA/DAP-Poland/Campaign-III.html'};
  // Image coordinates in the 1200 × 1476 source image; affine fit to six
  // labeled towns. The illustration is schematic and these are area centers.
  const markers = {
    'de-corps-21':[668,300], 'de-corps-1':[827,355], 'de-wodrig':[890,345],
    'de-corps-3':[315,420], 'de-corps-2':[330,390], 'de-corps-19':[338,345], 'de-border-1':[369,165],
    'de-corps-10':[390,825], 'de-corps-13':[440,890],
    'de-corps-11':[526,915], 'de-corps-16':[550,940], 'de-corps-14':[462,963], 'de-corps-4':[565,1026], 'de-corps-15':[617,1085],
    'de-corps-8':[564,1160], 'de-corps-17':[602,1275], 'de-corps-18':[756,1345], 'de-corps-7':[470,1092], 'de-corps-22':[768,1380],
    'de-id-1':[880,380], 'de-id-12':[914,380], 'de-id-11':[850,380], 'de-id-61':[815,380], 'de-kempf':[830,402],
    'de-id-21':[641,330], 'de-id-228':[686,330], 'de-id-217':[814,324], 'de-id-206':[1053,130],
    'de-id-3':[370,402], 'de-id-32':[375,383], 'de-id-50':[355,423], 'de-id-23':[267,365], 'de-id-218':[300,272],
    'de-id-207':[435,138], 'de-id-73':[225,405], 'de-id-208':[226,478], 'de-mid-2':[390,345], 'de-mid-20':[390,321], 'de-pz-3':[389,361], 'de-pz-10':[290,333],
    'de-id-24':[454,875], 'de-id-10':[466,894], 'de-id-17':[470,917], 'de-id-30':[416,875], 'de-id-221':[425,901],
    'de-id-18':[579,943], 'de-id-19':[574,928], 'de-id-14':[615,1000], 'de-id-31':[568,961], 'de-pz-1':[600,990], 'de-pz-4':[588,968],
    'de-mid-13':[508,950], 'de-mid-29':[442,1019], 'de-id-4':[590,1045], 'de-id-46':[608,1028],
    'de-light-1':[538,919], 'de-light-2':[611,1065], 'de-light-3':[506,1065],
    'de-id-8':[632,1135], 'de-id-28':[595,1134], 'de-id-239':[666,1110], 'de-pz-5':[587,1158],
    'de-id-44':[585,1242], 'de-id-45':[604,1298], 'de-id-7':[665,1323],
    'de-mtn-2':[950,1325], 'de-mtn-3':[800,1348], 'de-light-4':[800,1323], 'de-pz-2':[774,1305],
    'de-id-27':[508,1095], 'de-id-68':[570,1090], 'de-id-62':[482,1035]
  };
  const anchors = Object.fromEntries(Object.entries(markers).map(([id,[x,y]]) => {
    const lon=+(0.0066359595*x-0.0005156485*y+14.93332937).toFixed(4);
    const lat=+(-0.000151844*x-0.0042374446*y+55.13404546).toFixed(4);
    return [id,{lon,lat,place:'美国陆军战史地图所示部署地域（示意）',radiusKm:35,bearing:0,sources:[map,narrative],
      inferenceBasis:'按美国陆军战史地图7中1939年9月1日04:45单位符号位置作粗略地理配准；地图为示意图，点不是司令部、整支部队或精确前线位置。'}];
  }));
  // The map labels 1st Mountain Division as "later" and the 252/257/258th
  // were not yet ready; geographic placement at a frontline would mislead.
  const excluded = {
    'de-mtn-1':'地图标注稍后投入，9月1日地域未明确。',
    'de-id-252':'9月1日尚未就绪，不按前线部署。',
    'de-id-257':'9月1日尚未就绪，不按前线部署。',
    'de-id-258':'9月1日尚未就绪，不按前线部署。'
  };
  const headquarters={title:'美国陆军1942年战役研究：初始总部位于柏林附近，第10页',url:'https://www.ibiblio.org/hyperwar/Germany/DA-Poland/DA-Poland.html'};
  anchors['de-okh']={lon:13.4,lat:52.4,place:'柏林附近（区域推定）',radiusKm:50,bearing:90,sources:[headquarters],inferenceBasis:'美国陆军战时研究记载布劳希奇总部位于柏林附近；以柏林附近区域代表点推定，不表示具体总部建筑或已核实驻地。'};
  return {anchors,excluded,sources:[map,narrative,headquarters]};
})();
