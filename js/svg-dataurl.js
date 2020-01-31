const btoa = window.btoa

const toDataURL = (svgText) => {
  return 'data:image/svg+xml;charset=utf-8;base64,' + btoa(encodeURIComponent(svgText).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode('0x' + p1)))
}

const initCanvas = (svgDataURL, width, height) => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    const image = new window.Image()
    canvas.width = width
    canvas.height = height
    image.onload = () => {
      context.drawImage(image, 0, 0)
      resolve(canvas)
    }
    image.src = svgDataURL
  })
}

const privates = new WeakMap()

const getSVGDataURL = (self) => {
  return privates.get(self).svgDataURL
}

const getCanvas = (self) => {
  return privates.get(self).canvas
}

class SVGConverter {
  static load (svgText, width, height) {
    const dataURL = toDataURL(svgText)
    return initCanvas(dataURL, width, height).then((canvas) => {
      return new SVGConverter(dataURL, canvas)
    })
  }

  static loadFromElement (original) {
    const {width, height} = original.getBoundingClientRect()
    const svg = original.cloneNode(true)
    svg.setAttributeNS(null, 'version', '1.1')
    svg.setAttributeNS(null, 'width', width)
    svg.setAttributeNS(null, 'height', height)
    svg.setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns', 'http://www.w3.org/2000/svg')
    svg.setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:xlink', 'http://www.w3.org/1999/xlink')
    return SVGConverter.load(svg.outerHTML, width, height)
  }

  constructor (svgDataURL, canvas) {
    privates.set(this, {
      svgDataURL,
      canvas
    })
  }

  svgDataURL () {
    return getSVGDataURL(this)
  }

  pngDataURL () {
    return getCanvas(this).toDataURL('image/png')
  }

  jpegDataURL () {
    return getCanvas(this).toDataURL('image/jpeg')
  }
}
