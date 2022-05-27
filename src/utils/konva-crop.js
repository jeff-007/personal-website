import Konva from 'konva'

/**
 * Konva Image Cropping Plugin.
 *
 * cropTransform - position of the cropped image. x,y,width,height and rotation
 * enableCropOnDblClick - enable enter cropping on dblclick
 * cropEnd - exit cropping
 * cropStart - enter cropping
 */
(function (Konva) {
  /**
   * Decomposes standard 2x2 matrix into transform componentes
   * @static
   * @memberOf geometry
   * @param  {Array} a transformMatrix
   * @return {Object} Components of transform
   */
  function qrDecompose (a) {
    const angle = Math.atan2(a[1], a[0])
    const denom = Math.pow(a[0], 2) + Math.pow(a[1], 2)
    const scaleX = Math.sqrt(denom)
    const scaleY = (a[0] * a[3] - a[2] * a[1]) / scaleX

    return {
      rotation: angle / (Math.PI / 180),
      scaleX: scaleX,
      scaleY: scaleY,
      x: a[4],
      y: a[5]
    }
  }

  function getGroupCoords (object, group) {
    const mB = object.getAbsoluteTransform().getMatrix()
    const mX = group.getAbsoluteTransform().getMatrix()

    // possible to replace with mB * mX.invert()
    const M = mB[0]; const N = mB[1]; const O = mB[2]; const P = mB[3]; const R = mB[4]; const S = mB[5]
    const A = mX[0]; const B = mX[1]; const C = mX[2]; const D = mX[3]; const E = mX[4]; const F = mX[5]
    const AD = A * D
    const BC = B * C
    const G = (C * N - M * D) / (BC - AD)
    const H = (A * N - M * B) / (AD - BC)
    const I = (C * P - O * D) / (BC - AD)
    const J = (A * P - O * B) / (AD - BC)
    const K = (C * (S - F) + D * (E - R)) / (BC - AD)
    const L = (A * (S - F) + B * (E - R)) / (AD - BC)

    const matrix = [G, H, I, J, K, L]
    const options = qrDecompose(matrix)

    return options
  }

  /**
   * enable Cropping On DblClick
   */
  Konva.Image.prototype.enableCropOnDblClick = function () {
    this.on('dblclick', function (e) {
      this.cropStart()
    })
  }

  Konva.Image.prototype.setCropTransform = function (value) {
    if (value === false) {
      delete this._cropElement
      return
    }
    if (!this._cropElement) {
      this._cropElement = new Konva.Shape()
    }
    this._cropElement.setAttrs(value)
    this._cropElement.setAttrs({
      offsetX: 0,
      offsetY: 0
    })
    console.log('_cropElement', this._cropElement)
  }

  Konva.Image.prototype.getCropTransform = function () {
    return this._cropElement && this._cropElement.getAttrs()
  }

  Konva.Image.prototype.cropTransform = function (value) {
    if (value) {
      this.setCropTransform(value)
    } else {
      return this.getCropTransform()
    }
  }

  Konva.Image.prototype.cropEnd = function (context) {
    if (this.cropImage) {
      this.transformer.destroy()
      this.cropImageTransformer.destroy()
      this.cropImage.off('dragmove', this.cropUpdateBinded)
      this.cropImage.off('transform', this.cropUpdateBinded)
      this.off('dragmove', this.cropUpdateBinded)
      this.off('transform', this.resizAndCropUpdateBinded)
      this.cropImage.remove()
      delete this.cropImage
      delete this.transformer
      delete this.cropImageTransformer
      this.getLayer().draw()
    }
  }

  Konva.Image.prototype.cropUpdate = function (context) {
    const options = getGroupCoords(this.cropImage, this)
    this.cropTransform(options)
    this.getLayer().draw()
  }

  Konva.Image.prototype.resize = function () {
    this.setAttrs({
      scaleX: 1,
      scaleY: 1,
      width: this.width() * this.scaleX(),
      height: this.height() * this.scaleY()
    })
  }

  Konva.Image.prototype.cropReset = function (context) {
    if (this.cropImage) {
      this.cropEnd()
    }
    this.setCropTransform(false)
    this.getLayer().draw()
  }

  Konva.Image.prototype.cropStart = function (context) {
    const transformerList = this.getStage().find('Transformer')
    if (transformerList && transformerList.length > 0) {
      transformerList.forEach(transformer => {
        transformer.destroy()
      })
    }
    if (this.cropImage) {
      return
    }
    // _cropElement 设置裁剪变换
    if (!this._cropElement) {
      this.cropTransform({
        x: 0,
        y: 0,
        width: this.width(),
        height: this.height(),
        rotation: 0
      })
    }
    const layer = this.getLayer()
    const transform = this.getAbsoluteTransform()
    const transform2 = this._cropElement.getAbsoluteTransform()
    const transform0 = layer.getAbsoluteTransform()
    const options = qrDecompose(transform0.copy().invert().multiply(transform).multiply(transform2).getMatrix())

    // 生成一张透明的裁剪操作图
    this.cropImage = new Konva.Image({
      stroke: this.stroke(),
      strokeWidth: this.strokeWidth(),
      image: this.image(),
      opacity: 0.5,
      draggable: true
    })
    this.cropImage.isCroppingElement = true
    this.cropImage.setAttrs(options)
    this.cropImage.setAttrs({
      width: this._cropElement.width(),
      height: this._cropElement.height()
    })

    layer.add(this.cropImage)
    this.cropImageTransformer = new Konva.Transformer({
      borderDash: [5, 5],
      anchorSize: 20,
      anchorCornerRadius: 11
    })
      .attachTo(this.cropImage)

    this.transformer = new Konva.Transformer()
      .attachTo(this)

    layer.add(this.cropImageTransformer, this.transformer)
    // 到这里为止，在原图的基础上，创建了一张新的裁剪透明图，并在原图和裁剪透明图上创建动画，坐标与原图相同

    // 最终实现裁剪思路，原图的变换框（transformer）保持不变， 原图和透明裁剪示意图保持相同的变换（移动、旋转），达到变换透明裁剪图引导原图变换的效果，原图移动到示意图指定位置后，删除transformer以及透明引导图

    this.cropUpdateBinded = this.cropUpdate.bind(this)

    this.resizAndCropUpdateBinded = function () {
      this.resize()
      this.cropUpdate()
    }.bind(this)

    this.resize()
    this.cropUpdate()
    // 监听透明裁剪图的拖拽事件，让裁剪原图跟随透明裁剪图移动
    this.cropImage.on('dragmove', this.cropUpdateBinded)
    this.cropImage.on('transform', this.cropUpdateBinded)
    this.on('dragmove', this.cropUpdateBinded)
    this.on('transform', this.resizAndCropUpdateBinded)

    this.getStage().on('click tap', (e) => {
      if (e.target !== this.cropImage && e.target !== this) {
        this.cropEnd()
      }
    })
    layer.draw()
  }

  Konva.Image.prototype._sceneFunc = function (context) {
    let width = this.width()
    let height = this.height()
    const image = this.image()
    let cropWidth
    let cropHeight
    let params

    context.save()
    context.beginPath()
    context.rect(0, 0, width, height)
    context.closePath()
    context.clip()
    if (this.hasFill() || this.hasStroke()) {
      context.fillStrokeShape(this)
    }

    if (image) {
      if (this._cropElement) {
        context.save()
        width = this._cropElement.width()
        height = this._cropElement.height()
        const transform = this._cropElement.getAbsoluteTransform()
        const m = transform.getMatrix()
        context.transform(m[0], m[1], m[2], m[3], m[4], m[5])
      }

      cropWidth = this.cropWidth()
      cropHeight = this.cropHeight()
      if (cropWidth && cropHeight) {
        params = [
          image,
          this.cropX(),
          this.cropY(),
          cropWidth,
          cropHeight,
          0,
          0,
          width,
          height
        ]
      } else {
        params = [image, 0, 0, width, height]
      }

      context.drawImage.apply(context, params)

      if (this._cropElement) {
        context.restore()
      }
    }
    context.strokeShape(this)
    context.restore()
  }
})(Konva)
