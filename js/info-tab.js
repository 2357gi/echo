
/*
  Copyright (c) 2017 Hao Peng
  Released under the MIT license
  https://github.com/haoopeng/echo/blob/master/LICENSE
*/
$("#info-tab").on("click", showInfoArea);
$("#info-close").on("click", closeInfoArea);

// Infor function
function closeInfoArea() {
  $("#info")
    .css("right", "0px")
    .animate({"right": "-100%"}, 800)
  $("nav").show()
}

function showInfoArea() {
  $("#info")
    .css("right", "-100%")
    .animate({"right": "0px"}, 800)
  $("nav").hide()
}
