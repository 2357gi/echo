(function(){
  const COLOR_GRAPH = document.getElementById('color-graph'),
        MIN_COLOR   = 0,
        MAX_COLOR   = 200;
  if (!COLOR_GRAPH) return
  let p_list = '';

  for (let r = 200;r >= MIN_COLOR; r-=10){
    let p = '<div class="color-pixel flex-column">'
    for (let b = 0;b <= MAX_COLOR; b+=10){
      let color = `rgb(${r},0,${b})`;
      p         += `<p style='background-color:${color}'></p>`;
    }
    p      += '</div>'
    p_list += p;
  }

  COLOR_GRAPH.insertAdjacentHTML('afterbegin', p_list)
})();

/**
 * ノードの意見パラメータ大きさで変化するカラーコードを返す
 * @param {any(意見)} params
 * @param {number} mode
 * @returns {string} 'rgb(number,number,number)'
 */
function colors(params, mode = 0){
  try{
  let {first, second} = params;
  switch (mode){
    case 0:
      return selectColor({r: first, b: second})
    case 1:
      return selectColor({r: first})
    case 2:
      return selectColor({b: second})
  }
}catch{
  console.log(params)
}
}

/**
 * 最大値の意見の色を255にしたいのでよしなに
 * {
 *  @param {number} r
 *  @param {number} g
 *  @param {number} b
 * }
 */
function selectColor({r = 1, g = 1, b = 1}) {
  // データはrangeの範囲。積極的な意見の色を最大値(255)に近づけたい
  let r_param = parameter_to_plotParameter((-1) * r, 100);
  let g_param = parameter_to_plotParameter((-1) * g, 100);
  let b_param = parameter_to_plotParameter((-1) * b, 100);
  return `rgb(${r_param}, ${g_param}, ${b_param})`;

}
/**
 * 最低値を0にし、最大値が2までだったものを最大値までの範囲に拡張して返す
 * @param {number} param
 * @param {number} max
 */
function parameter_to_plotParameter(param, max){
  return (param + 1) * max
}