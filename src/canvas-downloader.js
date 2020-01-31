const DOWNLOAD_BUTTON = document.getElementById("opinion-graph-downloader")
const EPICURVES_QUERY = document.querySelector("#demo-plot")

function startConvert(image_file_name){
  html2canvas(EPICURVES_QUERY, {scale: 0.7, height: 600, y: 350})
    .then(function(canvas) {
      DOWNLOAD_BUTTON
        .setAttribute("href", canvas.toDataURL())
      DOWNLOAD_BUTTON
        .setAttribute("style", "display: block;");
      DOWNLOAD_BUTTON
        .setAttribute("download", image_file_name)
      console.log("convert finished")
    });
}