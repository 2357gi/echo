/*
  Copyright (c) 2017 Hao Peng
  Released under the MIT license
  https://github.com/haoopeng/echo/blob/master/LICENSE
*/

// init
const NODE_SIZE = 100,
      LINK_SIZE = 400;

const OPINION_MIN_RANGE = -1.0,
      OPINION_MAX_RANGE =  1.0,
      OPINION_LIST      = ["first", "second"];

const END_COUNTER      = 2000,
      SLOWEST_SPEED_ms = 200,
      POST_PROBABILITY = 0.4;

var counter          = 0,
    running          = false,
    remove_link_flag  = false,
    time_interval_ms = SLOWEST_SPEED_ms - Number($("#speed").val());

const interval = setInterval(runModel, time_interval_ms);

var tolerance = { first: 0, second: 0 },
    learning  = { first: 0, second: 0 },
    rewire;

const NETWORK_AREA_WIDTH  = document.getElementById("demo-graph-layout").offsetWidth,
      NETWORK_AREA_HEIGHT = document.getElementById("demo-graph-layout").offsetHeight - document.getElementById("speed-box").offsetHeight;

var nodes, 
    links, 
    adj_list,
    simulation,
    svgLinks,
    svgNodes,
    opinionSvgLinks,
    opinionSvgNodes;

var timeseries_first   = new Array(NODE_SIZE),
    timeseries_second = new Array(NODE_SIZE);
const TIMESERIES_PLOT_OPTIONS = {
  xaxis : {min: 0},
  yaxis : {min: OPINION_MIN_RANGE - 0.1, max: OPINION_MAX_RANGE + 0.1, tickLength: 0},
  series: {lines: {lineWidth: 0.8}, shadowSize: 0},
  grid  : {
    hoverable      : false,
    borderWidth    : 2,
    backgroundColor: '#fafafa'
  }
};
const TIMESERIES_PLOT_FIRST   = $.plot($("#demo-epicurves-1"), [], TIMESERIES_PLOT_OPTIONS),
      TIMESERIES_PLOT_SECOND  = $.plot($("#demo-epicurves-2"), [], TIMESERIES_PLOT_OPTIONS);

const NETWORK_SVG_GRAPH = d3.select("#demo-graph-layout")
  .append("svg")
  .call(downloadable())
  .attr("width" , NETWORK_AREA_WIDTH)
  .attr("height", NETWORK_AREA_HEIGHT)
  .attr("stroke", "#999")

const DISTRIBUTION_GRAPH_ELEMENT = document.getElementById("demo-opinion-graph-layout");
const DISTRIBUTION_SVG_GRAPH     = d3.select("#demo-opinion-graph-layout")
  .append("svg")
  .call(downloadable())
  .attr("width" , DISTRIBUTION_GRAPH_ELEMENT.offsetWidth)
  .attr("height", DISTRIBUTION_GRAPH_ELEMENT.offsetHeight)

$("#speed").on("change", update_speed);
$("#start-button").click(start_all);
$("#stop-button").click(stop_all);
$("#reset-button").click(reset_all);
$("#default-button").click(default_para);

for (let oi=0; oi<OPINION_LIST.length; oi=oi+1|0){
  $("#soflow-t-" + OPINION_LIST[oi]).on("change", {opinion: OPINION_LIST[oi]}, update_para);
  $("#soflow-i-" + OPINION_LIST[oi]).on("change", {opinion: OPINION_LIST[oi]}, update_para);
}
$("#soflow-u").on("change", {}, update_para);

get_parameters();
reset_all();
interval;

function runModel() {
  if (!running) return;
  // init
  var t_node = nodes[getRandomInt(0, NODE_SIZE-1)] // choice a node
  var concordant_nodes = {first : [], second: []},
      discordant_nodes = [],
      other_nodes      = [],
      discordant_links = [];
  // remove the unfriended link.
  if (!!remove_link_flag) {
    links.splice(links.length - 1, 1);
    remove_link_flag = false;
  }
  // check tolerance
  var link_count = 0;
  links.forEach(function(link){
    let {source, target} = link
    if (target.name == t_node.name) {
      let temp = source;

      source      = target;
      target      = temp;
      link.source = source;
      link.target = target;
    }
    if (source.name == t_node.name) {
      let discordant_flag = true
      OPINION_LIST.forEach(function(o){
        const isConcordant = Math.abs(source.opinion[o] - target.msg_opinion[o]) <= tolerance[o]
        if(isConcordant) {
          concordant_nodes[o].push(target)
          discordant_flag = false
        }
      })
      if(discordant_flag) {
        discordant_nodes.push(target);
        discordant_links.push(link);
      }
      link_count = link_count + 1 | 0;
      // When all connected nodes have been checked, terminate the operation.
      if(link_count === t_node.k) return;
    }
  })

  // identify nodes to which current node will connect.
  nodes.forEach(function(n_t){
    if ((n_t.name != t_node.name) && discordant_nodes.indexOf(n_t) == -1 ){
      if ((!concordant_nodes.first.some(hasNodeNameFrom(n_t))) || (!concordant_nodes.second.some(hasNodeNameFrom(n_t)))) {
        other_nodes.push(n_t);
      }
    }
  })
  // user post action
  const {chat_msg_one, chat_msg_three} = userActionPostMessage(concordant_nodes, t_node);
  // unfollow action
  var t_link = false;
  var chat_msg_two = '';
  if (discordant_nodes.length > 0) {
    if (Math.random() < rewire) {
      t_link = discordant_links[getRandomInt(0, discordant_links.length-1)];
      // add the link that will be removed from links.
      links.push(JSON.parse(JSON.stringify(t_link)));
      remove_link_flag = true;
      let t_list        = adj_list[t_node.index],
          del_node      = t_link.target,
          del_node_list = adj_list[del_node.index],
          index_o       = del_node_list.indexOf(t_node),
          index_d       = t_list.indexOf(del_node),
          add_node      = other_nodes[getRandomInt(0, other_nodes.length-1)],
          add_node_list = adj_list[add_node.index];
      t_list       .splice(index_d, 1);
      del_node_list.splice(index_o, 1);
      del_node.k--;
      t_list       .push(add_node);
      add_node_list.push(t_node);
      add_node.k++;
      t_link.target = add_node;
      chat_msg_two  = transJS("Unfollow", {"t_node.name":t_node.name,"del_node.name":del_node.name,"add_node.name":add_node.name}) + "<br/>";
    }
  }
  // highlight the newly established link
  update_network(t_node, t_link);
  avg_deviation = cal_avg_deviation();
  update_strength(avg_deviation);
  update_plot(count);
  $("#demo-chatting").append(String(count) + "<br/>");
  $("#demo-chatting").append(chat_msg_one + chat_msg_two + chat_msg_three +"<br/>");
  if (count == END_COUNTER) stop_all();
  showChatting();
  count += 1;
  if(count === 10) canControlSettingButton(true);
}

function showChatting() {
  // Prior to getting your chatting.
  const chatting     = document.getElementById('demo-chatting')
  const shouldScroll = chatting.scrollTop + chatting.clientHeight === chatting.scrollHeight;
  // After getting your chatting.
  if (!shouldScroll) {
    chatting.scrollTop = chatting.scrollHeight;
  }
}

function update_opinion(t_node_opinion, concordant_nodes, o) {
  let sum = 0
  concordant_nodes.forEach(function(node){
    sum += node.msg_opinion[o]
  })
  let nodes_average = sum / concordant_nodes.length,
      opinion_f     = (1 - learning[o]) * t_node_opinion + learning[o] * nodes_average;
  return opinion_f;
}

function cal_avg_deviation() {
  var total = 0,
      len   = 0;
  for (i in adj_list) {
    let nlist = adj_list[i],
        squ   = 0;
    if (nlist.length > 0) {
      for (j in nlist) {
        let nlo = nlist[j].opinion
        let ndo = nodes[i].opinion
        squ += Math.pow(average(nlo.first, nlo.second) - average(ndo.first, ndo.second), 2);
      }
      total += Math.sqrt(squ / nlist.length);
      len++;
    }
  }
  return total / len;
}

function update_network(t_node, t_link) {
  // safari doesn't allow assigning parameter default value.
  if (t_node === undefined) t_node = false;
  if (t_link === undefined) t_link = false;
  NETWORK_SVG_GRAPH.selectAll("line.link, circle.node").remove()
  DISTRIBUTION_SVG_GRAPH.selectAll("line.link, circle.node").remove();
  /*
  * SVG doesn't have a convenient equivalent to html's `z-index`; instead, it relied on the order of the elements in the markup.
  * Below, we add the nodes after the links to ensure that nodes apprear on top of links.
  **/
  svgLinks = NETWORK_SVG_GRAPH.selectAll("line.link")
    .data(links  , function(d) { return d.index; })
    .enter().append("line")
    .attr("class", "link");

  svgNodes = NETWORK_SVG_GRAPH.selectAll("circle.node")
    .data(nodes  , function(d) { return d.index; })
    .enter().append("circle")
    .attr("class", "node")
    .attr("r"    , function(d) { return 2 * Math.sqrt(d.k); })
    .style("fill" , function(d) { return colors(d.opinion); })
    .call(d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended));

  opinionSvgLinks = DISTRIBUTION_SVG_GRAPH.selectAll("line.link")
    .data(links, function(d) { return d.index; })
    .enter().append("line")
    .attr("class", "link");

  opinionSvgNodes = DISTRIBUTION_SVG_GRAPH.selectAll("circle.node")
    .data(nodes  , function(d) { return d.index; })
    .enter().append("circle")
    .attr("class", "node")
    .attr("r"    , function(d) { return 2 * Math.sqrt(d.k); })
    .style("fill" , function(d) { return colors(d.opinion); })

  if (t_node != false) {
    svgNodes._groups[0][t_node.index].style.fill,
    opinionSvgNodes._groups[0][t_node.index].style.fill = "black";
  }

  if (t_link != false) {
    // highlight the removed link and new link.
    svgLinks._groups[0][links.length-1].style,
    opinionSvgLinks._groups[0][links.length-1].style = {
      strokeDasharray: "5, 5",
      strokeOpacity  : 1,
      strokeWidth    : 2
    }
    svgLinks._groups[0][t_link.index].style,
    opinionSvgLinks._groups[0][t_link.index].style = {
      strokeOpacity  : 1,
      strokeWidth    : 2
    }
  }
  simulation.alpha(0.1);
  simulation.restart();
}

function update_plot(count) {
  for (let i = 0; i < NODE_SIZE; i = (i + 1) | 0) {
    timeseries_first[nodes[i].name].data.push([count, nodes[i].opinion.first]);
    timeseries_second[nodes[i].name].data.push([count, nodes[i].opinion.second]);
  }
  TIMESERIES_PLOT_FIRST.setData(timeseries_first);
  TIMESERIES_PLOT_FIRST.setupGrid();
  TIMESERIES_PLOT_FIRST.draw();

  TIMESERIES_PLOT_SECOND.setData(timeseries_second);
  TIMESERIES_PLOT_SECOND.setupGrid();
  TIMESERIES_PLOT_SECOND.draw();
}

function dragstarted(d) {
  if (!d.event.active) simulation.alphaTarget(0.2).restart();
  d.fx = d.x;
  d.fy = d.y;
}

function dragged(d) {
  d.fx = d3.event.x;
  d.fy = d3.event.y;
}

function dragended(d) {
  if (!d3.event.active) simulation.alphaTarget(0);
  d.fx = null;
  d.fy = null;
}

function ticked() {
  svgNodes
    .attr("cx", function(d) {
      const radius = 2 * Math.sqrt(d.k);
      const max    = NETWORK_AREA_WIDTH - radius;
      if      (d.x < radius) return d.x = radius + 1;
      else if (max < d.x)    return d.x = max - 1;
      else                   return d.x = d.x;
    })
    .attr("cy", function(d) {
      const radius = 2 * Math.sqrt(d.k);
      const max    = NETWORK_AREA_HEIGHT - radius;
      if      (d.y < radius) return d.y = radius + 1;
      else if (max < d.y)    return d.y = max - 1;
      else                   return d.y = d.y;
    });
  svgLinks
    .attr("x1", function(d) { return d.source.x; })
    .attr("y1", function(d) { return d.source.y; })
    .attr("x2", function(d) { return d.target.x; })
    .attr("y2", function(d) { return d.target.y; });

  const maxWidth  = DISTRIBUTION_GRAPH_ELEMENT.offsetWidth / 2,
        maxHeight = DISTRIBUTION_GRAPH_ELEMENT.offsetHeight / 2;
  opinionSvgNodes
    .attr("cx", function(d) {
      const radius = 2 * Math.sqrt(d.k);
      const max    = maxWidth - radius;
      return parameter_to_plotParameter(d.opinion.first, max)
    })
    .attr("cy", function(d) {
      const radius = 2 * Math.sqrt(d.k);
      const max    = maxHeight - radius;
      return parameter_to_plotParameter((-1) * d.opinion.second, max)
    })
  opinionSvgLinks
    .attr("x1", function(d) { return parameter_to_plotParameter(       d.source.opinion.first  , maxWidth); })
    .attr("y1", function(d) { return parameter_to_plotParameter((-1) * d.source.opinion.second, maxHeight); })
    .attr("x2", function(d) { return parameter_to_plotParameter(       d.target.opinion.first  , maxWidth); })
    .attr("y2", function(d) { return parameter_to_plotParameter((-1) * d.target.opinion.second, maxHeight); });
}

function update_speed() {
  const p = Number($(this).val());
  clearInterval(interval);
  time_interval_ms = SLOWEST_SPEED_ms - p;
  interval         = setInterval(runModel, time_interval_ms);
}

function get_parameters() {
  OPINION_LIST.forEach(function(o){
    tolerance[o] = Number($("#soflow-t-" + o).val());
    learning[o]  = Number($("#soflow-i-" + o).val());
    rewire       = Number($("#soflow-u").val());
  })
}

function update_para(e) {
  const p    = Number($(this).val()),
        name = $(this).attr("id");
  if (name == ("soflow-u")) {
    rewire             = p;
    return
  }
  const {opinion} = e.data;
  if (name == ("soflow-t-" + opinion)) {
    tolerance[opinion] = p;
  } else if (name == ("soflow-i-" + opinion)) {
    learning[opinion]  = p;
  }
}

function default_para() {
  OPINION_LIST.forEach(function(opinion){
    $("#soflow-t-" + opinion).val(0.4);
    $("#soflow-i-" + opinion).val(0.8);
    $("#soflow-u").val(0.9);
    tolerance[opinion] = 0.4;
    learning[opinion]  = 0.8;
    rewire             = 0.9;
  })
}

function start_all() {
  running = true;
}

function stop_all() {
  running = false;
}

function reset_all() {
  stop_all();
  count = 0;
  canControlSettingButton(false)
  $("#demo-chatting").html("");
  showChatting();
  // creates a random graph on NODE_SIZE nodes and m links
  [nodes, links, adj_list] = createRandomNet(NODE_SIZE, LINK_SIZE);
  for (let i = 0; i < NODE_SIZE; i = (i + 1) | 0) {
    timeseries_first[i]         = [];
    timeseries_second[i]       = [];
    timeseries_first[i].data    = [];
    timeseries_second[i].data  = [];
    timeseries_first[i].color   = colors(nodes[i].opinion, 1);
    timeseries_second[i].color = colors(nodes[i].opinion, 2);
  }

  simulation = d3
    .forceSimulation()
    .force("link", d3.forceLink().id(function(d) { return d.index; }).distance(10).strength(0.1))
    .force("charge", d3.forceManyBody().strength(-73))
    .force("center", d3.forceCenter(NETWORK_AREA_WIDTH / 2, NETWORK_AREA_HEIGHT / 2));

  simulation
    .nodes(nodes)
    .on("tick", ticked);

  simulation
    .force("link")
    .links(links);

  update_network();
  update_plot(count);
}

function update_strength(avg_deviation) {
    simulation.force("charge", d3.forceManyBody().strength(-1-avg_deviation*90));
}

function createRandomNet(n, m) {
  const list     = randomChoose(unorderedPairs(d3.range(n)), m);
  const links    = list.map(function (a) { return {source: a[0], target: a[1]}; });
  let nodes      = d3.range(n).map(function (i) {return {name: i}; });
      adj_list = [];
  for (n in nodes) {
    let num = {
      first : genRandomValue(OPINION_MIN_RANGE, OPINION_MAX_RANGE),
      second: genRandomValue(OPINION_MIN_RANGE, OPINION_MAX_RANGE)
    }
    nodes[n].k = 0;
    nodes[n].opinion     = num;
    nodes[n].msg_opinion = num;
    adj_list[n]          = [];
  }
  for (l in links) {
    const i = links[l].source;
    const j = links[l].target;
    nodes[links[l].source].k++;
    nodes[links[l].target].k++;
    adj_list[i].push(nodes[j]);
    adj_list[j].push(nodes[i]);
  }
  return [nodes, links, adj_list];
}

function average(...n){
  let temp = n.reduce(function(sum, item){
    return sum + item
  }, 0)
  return temp / n.length;
}

/**
 * Returns a random number between min (inclusive) and max (exclusive)
 */
function genRandomValue(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Returns a random integer between min (inclusive) and max (inclusive)
 * Using Math.round() will give you a non-uniform distribution!
 */
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// returns a random k element subset of s
function randomChoose(s, k) {
  let a = [];
  for(let i = 0;i < k; i=(i+1)|0){
    const j = Math.floor(Math.random() * s.length);
    a.push(s.splice(j, 1)[0]);
  };
  return a;
}

// returns the list of all unordered pairs from s
function unorderedPairs(s) {
  let a = [];
  for (let i = 0;i < s.length; i=(i+1)|0) {
    for (let j = (i+1)|0;j < s.length; j=(j+1)|0) {
      a.push([s[i],s[j]])
    }
  };
  return a;
}

function roundToTwo(num) {
  return +(Math.round(num + "e+2")  + "e-2");
}

// return boolean
function hasNodeNameFrom (n_t){
  return function(one_of_node_name){
    return n_t.name === one_of_node_name
  }
}

/* return chat message object
* {chat_msg_three: string, chat_msg_one: string}
*/
function userActionPostMessage(concordant_nodes, t_node) {
  let chat_msg_three, chat_msg_one = '';
  if(concordant_nodes.length <= 0){
    t_node.msg_opinion = t_node.opinion;
    chat_msg_three = transJS("PostMessage", {"t_node.name":t_node.name}) + "<br/>";
    return {chat_msg_one, chat_msg_three};
  }
  // update user opinion
  const { first, second } = concordant_nodes;
  const canPost = Math.random() < POST_PROBABILITY;
  if(first.length > 0) t_node.opinion.first = update_opinion(t_node.opinion.first, concordant_nodes.first, OPINION_LIST[0]);
  if(second.length > 0) t_node.opinion.second = update_opinion(t_node.opinion.second, concordant_nodes.second, OPINION_LIST[1]);
  if(canPost) {
    if(first.length > 0) t_node.msg_opinion.first = t_node.opinion.first;
    if(second.length > 0) t_node.msg_opinion.second = t_node.opinion.second;
    chat_msg_three = transJS("PostMessage", {"t_node.name":t_node.name}) + "<br/>";
  } else {
    let repost_node;
    if(first.length > 0){
      repost_node = concordant_nodes.first[getRandomInt(0, concordant_nodes.first.length - 1)];
      t_node.msg_opinion.first = repost_node.msg_opinion.first;
    }
    if(second.length > 0){
      repost_node = concordant_nodes.second[getRandomInt(0, concordant_nodes.second.length - 1)];
      t_node.msg_opinion.second = repost_node.msg_opinion.second;
    }
    chat_msg_three = transJS("RepostMessage", {"t_node.name":t_node.name, "repost_node.name":repost_node.name}) + "<br/>";
  }
  // post a message
  OPINION_LIST.forEach(function(o){
    const prev_opinion = t_node.opinion[o]
    if (learning[o] > 0) {
      chat_msg_one = transJS("ReadMessage",{"t_node.name":t_node.name, "concordant_nodes.length":concordant_nodes[o].length}) + "<br/>";
      if (prev_opinion <= 0) {
        if (t_node.opinion < prev_opinion) {
          chat_msg_one += transJS("BecomeMoreProgressice",{"t_node.name":t_node.name}) + "<br/>";
        } else {
          chat_msg_one += transJS("BecomeLessProgressice",{"t_node.name":t_node.name}) + "<br/>";
        }
      }
      if (prev_opinion > 0) {
        if (t_node.opinion[o] < prev_opinion) {
          chat_msg_one += transJS("BecomeLessConservative",{"t_node.name":t_node.name}) + "<br/>";
        } else {
          chat_msg_one += transJS("BecomeMoreConservative",{"t_node.name":t_node.name}) + "<br/>";
        }
      }
    }
  })
  return {chat_msg_one, chat_msg_three};
}

// control buttons tolerance, learning, unfollow
function canControlSettingButton (isDisabled) {
  if (isDisabled) {
    OPINION_LIST.forEach(function(o){
      document.getElementById("soflow-t-" + o).setAttribute("disabled", "disabled")
      document.getElementById("soflow-i-" + o).setAttribute("disabled", "disabled")
    })
    document.getElementById("soflow-u").setAttribute("disabled", "disabled")
  } else {
    OPINION_LIST.forEach(function(o){
      document.getElementById("soflow-t-" + o).removeAttribute("disabled")
      document.getElementById("soflow-i-" + o).removeAttribute("disabled")
    })
    document.getElementById("soflow-u").removeAttribute("disabled")
  }
}