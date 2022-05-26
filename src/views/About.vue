<template>
  <div class="home">
    <button id="cropPhotoEnd" @click="cropEndHandle">cropPhotoEnd</button>
    <button id="cropPhotoStart" @click="cropStartHandle">cropPhotoStart</button>
    <button id="cropPhotoReset" @click="cropResetHandle">cropPhotoReset</button>
    <div id="container"></div>
  </div>
</template>

<script>
import Konva from 'konva'
// import konvaCrop from '@/utils/konva-crop.js'
export default {
  name: 'Home',
  components: {},
  data () {
    return {
      stage: null,
      layer: null,
      transformer: null,
      target: null,
      defaultImg: 'https://img2.wmnetwork.cc/w/202112/09/0_20211209165113_keQSPZNW.png'
    }
  },
  created () {},
  mounted () {
    console.log('Konva', Konva)
    this.initStage()
    this.initImg(this.defaultImg)
  },
  methods: {
    cropEndHandle () {
      console.log(this.target)
      this.target && this.target.cropEnd()
    },
    cropStartHandle () {
      console.log(this.target)
      this.target && this.target.cropStart()
    },
    cropResetHandle () {
      console.log(this.target)
      this.target && this.target.cropReset()
    },
    initStage () {
      this.stage = new Konva.Stage({
        container: 'container',
        width: window.innerWidth,
        height: window.innerHeight
      })
      this.layer = new Konva.Layer()
      this.stage.add(this.layer)

      this.stage.on('click tap', (e) => {
        if (this.transformer) {
          this.transformer.destroy()
        }
        if (e.target === this.stage || e.target.isCroppingElement) {
          this.layer.draw()
          return
        }
        this.target = e.target
        console.log('target', this.target)
        this.transformer = new Konva.Transformer()
        this.layer.add(this.transformer)
        this.transformer.nodes([e.target])
        this.layer.batchDraw()
      })
      this.stage.scaleX(2)
      this.stage.scaleY(2)
    },

    // 初始化图片
    initImg (src) {
      Konva.Image.fromURL(src, (konvaImage) => {
        konvaImage.setAttrs({
          stroke: 'black',
          strokeWidth: 1,
          y: 100,
          x: 118,
          width: 200,
          height: 125,
          draggable: true,
          cropTransform: {
            height: 175,
            rotation: 10,
            scaleX: 1.256718546954032,
            scaleY: 1.6075454233616444,
            width: 250,
            x: -23.179330196090106,
            y: -100.75893930126733
          }
        })
        // konvaImage.enableCropOnDblClick()
        this.layer.add(konvaImage)
        this.layer.draw()
        // setTimeout(() => {
        //   konvaImage.cropStart()
        // })
      })

      Konva.Image.fromURL(src, (konvaImage) => {
        konvaImage.setAttrs({
          y: 50,
          x: 350,
          width: 300,
          height: 300,
          draggable: true,
          clip: {
            x: 100,
            y: 40,
            width: 10,
            height: 20
          }
        })
        // konvaImage.enableCropOnDblClick()
        this.layer.add(konvaImage)
        this.layer.draw()
      })
    }
  }
}

/**
   * Konva Image Cropping Plugin.
   *
   * cropTransform - position of the cropped image. x,y,width,height and rotation
   * enableCropOnDblClick - enable enter cropping on dblclick
   * cropEnd - exit cropping
   * cropStart - enter cropping
   */

</script>

<style scoped lang="scss">
  html,body,#container{
    width: 100%;
    height: 100%;
    margin: 0;
  }

  button{
    position: absolute;
    top: 10px;
    width: 120px;
    box-sizing: border-box;
    line-height:30px;
    z-index: 1
  }
  #cropPhotoEnd{
    left:10px;
  }
  #cropPhotoStart{
    left:140px;
  }
  #cropPhotoReset{
    left:270px;
  }
</style>
