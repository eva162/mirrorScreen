<template>
  <div id="app" v-loading="isLoading">
    <div class="btn-box">
      <button :class="{active:type==='screen'}" @pointerdown="handleResize('screen')">适合屏幕</button>
      <button :class="{active:type==='page'}" @pointerdown="handleResize('page')">适合页面</button>
      <button :class="{active:type==='original'}" @pointerdown="handleResize('original')">原始大小</button>
      <button @pointerdown="zoomIn">放大</button>
      <button @pointerdown="zoomOut">缩小</button>
      <button @pointerdown="antiClockwise">逆时针旋转</button>
      <button @pointerdown="clockwise">顺时针旋转</button>
      <button @pointerdown="showML=!showML">{{showML?'隐藏':'显示'}}目录</button>
      <button @pointerdown="print">打印信息</button>
      <button @pointerdown="isSelect=!isSelect">{{isSelect?'选择':'移动'}}</button>
    </div>
    <div class="stage_box">
      <div class="stage" ref="stage" @touchstart.prevent>
        <!--<div class="stage_box">-->
        <div id="container" ref="container" @pointermove="containerHandlePointermove"></div>

        <div class="scrollHbar" ref="scrollHbar">
          <div class="thumbH" ref="thumbH" @pointerdown="HbarScroll"></div>
        </div>
        <div class="scrollWbar" ref="scrollWbar">
          <div class="thumbW" ref="thumbW" @pointerdown="WbarScroll"></div>
        </div>
        <div class="tip" ref="tip" @pointerdown="HbarScroll">{{currentPage+1}}</div>
      </div>
      <div class="mulu" :class="{'is-show':showML}">
        <div v-for="item in imageList"
             class="item"
             :id="'page_'+item.page"
             :class="{active:item.page===currPage}"
             @click="skipPage(item.page)">{{item.src}}
        </div>
      </div>
    </div>
    <div class="info-box">
      当前比例：{{scaleText}}，
      当前页：{{currentPage+1+'/'+totalCount}}，
      垂直进度：{{progressText}}，
      当前路径：{{currentFile}}
    </div>

    <div class="selectionToolbar" ref="selectionToolbar">
      <div class="toolbar-item" @click="toolbarHandleClick(item,$event)" v-for="item in selectionToolbar">
        {{item.label}}
      </div>
    </div>
  </div>
</template>

<script>
  const fs = require('fs')
  const path = require('path')
  const Konva = require('konva')
  require('../module/hammer')
  const Hammer = window.Hammer
  const fixwidth = 595

  // const fixheight = 841

  function consoleLog () {
    let arg = [...arguments]

    let strs = []
    let logs = []
    arg.map(item => {
      if (item.constructor === String && strs.length < 2) {
        strs.push(item)
      } else {
        logs.push(item)
      }
    })

    let styles = []
    let log = ''
    if (strs.length === 1) {
      log = `%c ${strs[0]} %c`
      styles.push('background:#41b883;padding:1px;border-radius:0 3px 3px 0;color: #fff')
    } else if (strs.length === 2) {
      log = `%c ${strs[0]} %c ${strs[1]} %c`
      styles.push('background:#35495e; padding:1px;border-radius:3px 0 0 3px;color:#fff')
      styles.push('background:#41b883; padding:1px;border-radius:0 3px 3px 0;color:#fff')
    }

    styles.push('background:transparent')

    console.log(log, ...styles, ...logs)
  }

  export default {
       name: 'main-page',
    data () {
      return {
        stageSize: {width: 0, height: 0}, // 舞台大小
        type: '', // 缩放类型
        imageList: [], // 图片列表
        textList: [], // 文本列表
        cacheList: [], // image缓存列表
        cacheListCount: 100, // image缓存个数
        scale: 1, // 缩放
        stage: null, // 舞台
        imageLayer: null, // 图层
        textLayer: null, // 文本图层
        renderText: false,
        currentTop: 0, // 到上面的位置
        minTop: 0,
        maxTop: 0,
        currentLeft: 0, // 到左边的距离
        cacheCount: 10, // 缓存个数
        loading: {},
        oldProgress: 0,
        currPage: 0,
        showML: false,
        isLoading: false,
        stopInertiaMove: true,
        lastMoveTime: 0,
        touchPoints: 0,
        lastMoveStart: 0,
        lastVelocityX: 0,
        lastVelocityY: 0,
        tempScale: 1,
        minScale: 0.05,
        maxScale: 5,
        tempTop: 0,
        lastPointerPositionX: 0,
        lastPointerPositionY: 0,
        firstScreenX: 0,
        firstScreenY: 0,
        firstWord: '',
        selectionText: '',
        isSelect: true,
        outCanvas: '',
        timer: '',
        lastWord: '',
        selectionToolbar: [
          {
            label: '标注',
            click: evt => console.log('点击了标注', this.selectionText)
          },
          {
            label: '复制',
            click: evt => {
              let tempEl = document.createElement('textarea')
              tempEl.value = this.selectionText
              tempEl.display = 'none'
              document.body.append(tempEl)
              tempEl.select()
              document.execCommand('copy')
              tempEl.parentElement.removeChild(tempEl)
            }
          }
        ],
        tempLeft: 0
      }
    },
    directives: {
      loading: {
        bind (el, binding, vnode, oldVnode) {
          if (binding.value) {
            let loading = el.querySelector('#loading')
            if (loading) return
            loading = document.createElement('div')
            loading.id = 'loading'
            let i1 = document.createElement('i')
            let i2 = document.createElement('i')
            let i3 = document.createElement('i')
            let i4 = document.createElement('i')
            let i5 = document.createElement('i')
            let i6 = document.createElement('i')
            let i7 = document.createElement('i')
            let i8 = document.createElement('i')
            let div = document.createElement('div')
            div.append(i1, i2, i3, i4, i5, i6, i7, i8)
            loading.append(div)
            el.appendChild(loading)
          }
        },
        update (el, binding, vnode, oldVnode) {
          if (binding.value) {
            let loading = el.querySelector('#loading')
            if (loading) return
            loading = document.createElement('div')
            loading.id = 'loading'
            let i1 = document.createElement('i')
            let i2 = document.createElement('i')
            let i3 = document.createElement('i')
            let i4 = document.createElement('i')
            let i5 = document.createElement('i')
            let i6 = document.createElement('i')
            let i7 = document.createElement('i')
            let i8 = document.createElement('i')
            let div = document.createElement('div')
            div.append(i1, i2, i3, i4, i5, i6, i7, i8)
            loading.append(div)
            el.appendChild(loading)
          } else {
            let loading = el.querySelector('#loading')

            if (loading) loading.parentElement.removeChild(loading)
          }
        }
      }
    },
    computed: {
      scaleText () {
        return Math.round(this.scale * 10000) / 100 + '%'
      },
      totalCount () {
        return this.imageList.length
      },
      // allHeight () {
      //   let totalHeight
      //   if (this.stage && this.totalCount) totalHeight = this.stageSize.height * this.totalCount
      //   return totalHeight || this.totalCount
      // },
      viewHeight () {
        return this.stage ? this.stage.height() / this.scale : this.totalCount
      },
      totalHeight () {
        let totalHeight
        if (this.stage && this.totalCount) totalHeight = this.stageSize.height * this.totalCount - this.stage.height() / this.scale
        return totalHeight || this.totalCount
      },
      totalWidth () {
        return this.stage ? (this.stageSize.width - this.stage.width() / this.scale) : this.totalCount
      },
      progressText () {
        return Math.round(this.progress * 10000) / 100 + '%'
      },
      progress () {
        return this.totalHeight && this.currentTop ? (this.currentTop - this.minTop) / this.totalHeight : this.currentTop
      },
      currentPage () {
        let page = -1
        if (this.stageSize.height) page = Math.floor(((this.currentTop - this.minTop) + this.viewHeight / 2) / this.stageSize.height)
        return page
      },
      currentFile () {
        let img = this.imageList.find(item => item.page === this.currentPage)
        return img ? img.src : ''
      }
    },
    async mounted () {
      await this.initData()
      this.isLoading = true
      await this.cacheImage()
      this.isLoading = false

      let mc = new Hammer.Manager(document.getElementById('container'))
      mc.add(new Hammer.Pan())
      mc.add(new Hammer.Pinch()).recognizeWith([mc.get('pan')])
      mc.add(new Hammer.Tap())
      mc.on('panstart panmove panend', this.onPan)
      mc.on('pinchstart pinchmove pinchend', this.onPinch)
      mc.on('tap', this.onTap)

      this.stage = new Konva.Stage({
        container: 'container',
        offsetX: -this.stageSize.width / 2,
        offsetY: -this.stageSize.height / 2,
        width: this.stageSize.width,
        height: this.stageSize.height
      })

      this.imageLayer = new Konva.Layer()

      this.stage.add(this.imageLayer)

      this.handleResize()

      this.$refs.stage.addEventListener('wheel', evt => {
        if (evt.ctrlKey) {
          if (evt.deltaY > 0) {
            this.zoomOut()
          } else {
            this.zoomIn()
          }
          return
        }
        this.scrollView(evt.deltaY > 0)
      })

      window.addEventListener('resize', () => {
        this.handleResize(this.type)
      })
      // window.addEventListener('blur', () => {
      //   this.clearAllSelection()
      // })
    },
    watch: {
      currentTop () {
        this.oldProgress = this.progress
      }
    },
    methods: {
      scrollView (isUp = true) {
        if (isUp) {
          this.currentTop += 40 / this.scale
        } else {
          this.currentTop -= 40 / this.scale
        }

        this.locateScrollBarPosition()

        this.stagescroll()
      },
      getPointerPosition () {
        let pointerPosition = this.stage.getPointerPosition()
        this.outCanvas = ''

        if (pointerPosition) {
          if (pointerPosition.x < 0 || pointerPosition.y < 0 ||
            pointerPosition.x > this.stage.width() || pointerPosition.y > this.stage.height()) {
            pointerPosition = undefined
          }
        }
        if (!pointerPosition) {
          let x = this.lastPointerPositionX + (event.screenX - this.firstScreenX)
          let y = this.lastPointerPositionY + (event.screenY - this.firstScreenY)
          if (x < 0) {
            x = 0
          } else if (x > this.stage.width()) x = this.stage.width()
          if (y < 0) {
            y = 0
            this.outCanvas = 'top'
          } else if (y > this.stage.height()) {
            y = this.stage.height()
            this.outCanvas = 'bottom'
          }

          pointerPosition = {x: x, y: y}
        }
        return pointerPosition
      },
      gePointerPositionReferToCanvasCenter () {
        let pointerPosition = this.getPointerPosition()
        return {
          x: pointerPosition.x - this.stage.width() / 2,
          y: pointerPosition.y - this.stage.height() / 2
        }
      },
      toolbarHandleClick (item, evt) {
        this.clearAllSelection()
        if (typeof item.click === 'function') item.click(evt)
      },
      showToolbar (evt = window.event) {
        if (!evt) return

        this.selectionText = ''
        let texts = this.stage.find('.selection').map((child, index) => {
          return {
            page: Number(child.getAttr('id').replace('selection', '')),
            text: child.getAttr('text')
          }
        })
        texts.sort((a, b) => (a.page - b.page))
        texts.map((child, index) => {
          if (index) this.selectionText += `\n`
          this.selectionText += child.text
        })
        if (!this.selectionText) return

        let selectionToolbar = this.$refs.selectionToolbar
        let x = evt.screenX
        let y = evt.screenY
        if (evt.pointerType !== 'pen') {
          x -= window.screenX
          y = y - window.screenY - (window.outerHeight - window.innerHeight)
        } else {
          y = evt.pageY
        }
        y = y + selectionToolbar.offsetHeight
        x = x - selectionToolbar.offsetWidth / 2

        if (x < 0) {
          x = 0
        } else if (x + selectionToolbar.offsetWidth > window.innerWidth) x = window.innerWidth - selectionToolbar.offsetWidth

        if (y < 0) {
          y = 0
        } else if (y + selectionToolbar.offsetHeight > window.innerHeight) y = window.innerHeight - selectionToolbar.offsetHeight

        selectionToolbar.style.top = y + 'px'
        selectionToolbar.style.left = x + 'px'

        selectionToolbar.style.visibility = 'visible'
      },
      hideToolbar () {
        this.$refs.selectionToolbar.style.visibility = 'hidden'
      },
      clearAllSelection () {
        this.stage.find('.selection').map(child => child.destroy())
        this.imageLayer.draw()
        this.hideToolbar()
      },
      onTap (evt) {
        if (evt.pointerType === 'pen' || (evt.pointerType === 'mouse' && this.isSelect)) {
          let currentWord = this.getCurrentWord()
          if (currentWord) {
            consoleLog('点中的文字', currentWord.text, currentWord)
            if (evt.srcEvent.shiftKey) {
              this.drawSelectionRect(this.lastWord, currentWord)
              this.showToolbar()
              return
            } else {
              this.lastWord = currentWord
            }
          }
        }

        this.stopInertiaMove = true
        this.clearAllSelection()
      },
      onPinch (evt) {
        if (evt.type === 'pinchstart') this.tempScale = this.scale || 1
        this.type = ''
        this.scale = evt.scale * this.tempScale
        this.changeScale()
      },
      onPan (evt) {
        this.stopInertiaMove = true
        if ((evt.pointerType === 'mouse' && this.isSelect) || evt.pointerType === 'pen') {
          let pointerPosition = this.stage.getPointerPosition()
          if (pointerPosition) {
            if (pointerPosition.x < 0 || pointerPosition.y < 0 ||
              pointerPosition.x > this.stage.width() || pointerPosition.y > this.stage.height()) {
              pointerPosition = undefined
            }
          }
          if (!pointerPosition) {
            if (this.outCanvas === 'top') {
              this.scrollView(false)
            } else if (this.outCanvas === 'bottom') {
              this.scrollView(true)
            }
          } else {
            this.lastPointerPositionX = pointerPosition.x
            this.lastPointerPositionY = pointerPosition.y
          }
          if (evt.type === 'panstart') {
            this.firstScreenX = evt.srcEvent.screenX
            this.firstScreenY = evt.srcEvent.screenY
            this.clearAllSelection()
          }
          let currentWord = this.getCurrentWord()
          if (!currentWord) return
          if (!this.firstWord) this.firstWord = currentWord

          this.drawSelectionRect(this.firstWord, currentWord)

          if (evt.isFinal) {
            this.firstWord = ''
            this.showToolbar()
          }
          return
        }
        if (evt.type === 'panstart') {
          this.tempTop = this.currentTop
          this.tempLeft = this.currentLeft
          this.clearAllSelection()
        }
        this.currentTop = this.tempTop - evt.deltaY / this.scale
        this.currentLeft = this.tempLeft - evt.deltaX / this.scale
        this.locateScrollBarPosition()
        this.stagescroll()
        if (evt.isFinal) {
          this.stopInertiaMove = false
          this.autoScrollView(this.lastVelocityY, this.lastVelocityX)
        } else {
          this.lastVelocityY = evt.velocityY
          this.lastVelocityX = evt.velocityX
        }
      },
      drawSelectionRect (startWord, endWord) {
        let allWords = this.getAllWordsFromWordA2WordB(startWord, endWord)
        let names = Object.keys(allWords)
        console.log(names)
        this.stage.find('.selection').map(child => {
          if (names.indexOf(child.id()) === -1) {
            child.destroy()
          }
        })
        names.map(name => {
          let shape = this.stage.findOne(`#${name}`)
          if (shape) {
            shape.setAttrs({
              x: allWords[name].x,
              y: allWords[name].y,
              width: allWords[name].width,
              height: allWords[name].height,
              text: allWords[name].text
            })
          } else {
            let group = this.stage.findOne(`.${allWords[name].page}`)
            shape = new Konva.Rect({
              x: allWords[name].x,
              y: allWords[name].y,
              width: allWords[name].width,
              height: allWords[name].height,
              fill: '#3390ff',
              listening: false,
              id: name,
              name: 'selection',
              opacity: 0.2,
              text: allWords[name].text
            })
            group.add(shape).draw()
            console.log(group)
          }
        })
        this.imageLayer.draw()
      },
      containerHandlePointermove (evt) {
        if ((evt.pointerType === 'mouse' && this.isSelect) || evt.pointerType === 'pen') {
          this.$refs.container.style.cursor = 'text'
        } else {
          this.$refs.container.style.cursor = 'move'
        }
      },
      autoScrollView (vy, vx) {
        let startTime = Date.now()
        let startY = this.currentTop
        let startX = this.currentLeft
        let diry = vy > 0 ? -1 : 1 // 加速度方向
        let dirx = vx > 0 ? -1 : 1 // 加速度方向
        let k = 0.003
        let ay = diry * k // 加速度
        let ax = dirx * k // 加速度
        let inertiaMove = () => {
          if (this.stopInertiaMove) return
          let t = Date.now() - startTime
          let nowVy = vy + t * ay
          let nowVx = vx + t * ax
          // 速度方向变化表示速度达到 0 了
          let moveY = 0
          let moveX = 0

          if (diry * nowVy < 0) moveY = vy * t + ay * (t ** 2) / 2
          if (dirx * nowVx < 0) moveX = vx * t + ax * (t ** 2) / 2

          if (!(moveY || moveX)) return

          if (moveY) {
            this.currentTop = startY - moveY / this.scale
          }
          if (moveX) {
            this.currentLeft = startX - moveX / this.scale
          }

          this.locateScrollBarPosition()

          this.stagescroll()

          setTimeout(inertiaMove, 10)
        }

        setTimeout(inertiaMove, 10)
      },
      reduceTouchPoints (evt) {
        this.touchPoints -= 1
        if (this.touchPoints === 0) window.removeEventListener('pointerup', this.reduceTouchPoints)
      },
      pointerup (evt) {
        window.removeEventListener('pointermove', this.pointermove)
        window.removeEventListener('pointerup', this.pointerup)

        let nowY = evt.screenY

        // 滚动实现
        let nowTime = Date.now()
        let v = (nowY - this.lastMoveStart) / (nowTime - this.lastMoveTime)
        // 最后一段时间手指划动速度
        this.stopInertiaMove = false;
        ((v, startTime, contentY) => {
          let dir = v > 0 ? -1 : 1 // 加速度方向
          let a = dir * 0.0006 // 加速度
          let inertiaMove = () => {
            if (this.stopInertiaMove) return
            let nowTime = Date.now()
            let t = nowTime - startTime
            let nowV = v + t * a
            // 速度方向变化表示速度达到 0 了
            if (dir * nowV > 0) return
            let moveY = v * t + a * (t ** 2) / 2

            this.currentTop = contentY - moveY / this.scale

            this.locateScrollBarPosition()

            this.stagescroll()

            setTimeout(inertiaMove, 10)
          }

          inertiaMove()
        })(v, nowTime, this.currentTop)
      },
      pointermove (evt) {
        this.stopInertiaMove = true
        // y轴方向上的滑动
        // let deltaY = evt.screenY - mouseStartY
        let nowTime = Date.now()

        this.currentTop -= evt.movementY / this.scale

        this.locateScrollBarPosition()

        this.stagescroll()
        if (nowTime - this.lastMoveTime > 300) {
          this.lastMoveTime = nowTime
          this.lastMoveStart = evt.screenY
        }
      },
      pointerdown (evt) {
        this.lastMoveTime = Date.now()
        this.lastMoveStart = evt.screenY
        this.stopInertiaMove = true
        this.touchPoints += 1

        console.log('当前有：', this.touchPoints, '个触摸点')
        if (this.touchPoints === 1) {
          window.addEventListener('pointerup', this.pointerup)
          window.addEventListener('pointermove', this.pointermove)
          window.addEventListener('pointerup', this.reduceTouchPoints)
        } else if (this.touchPoints === 2) {
          window.removeEventListener('pointermove', this.pointermove)
          window.removeEventListener('pointerup', this.pointerup)

          window.addEventListener()
        } else {
        }
      },
      activePage (page) {
        let node = document.getElementById(`page_${page}`)
        if (node) node.scrollIntoView({behavior: 'smooth', block: 'nearest'})
        this.currPage = page
      },
      /**
       * 根据currentTop、currentLeft确定滚动条的位置
       */
      locateScrollBarPosition () {
        let thumbH = this.$refs.thumbH
        let thumbW = this.$refs.thumbW
        let scrollHbar = this.$refs.scrollHbar
        let scrollWbar = this.$refs.scrollWbar
        let tip = this.$refs.tip

        if (this.currentTop < this.minTop) {
          this.currentTop = this.minTop
        } else if (this.currentTop > this.maxTop) this.currentTop = this.maxTop

        let maxY = scrollHbar.offsetHeight - thumbH.offsetHeight

        let _thumbStartY = (this.currentTop - this.minTop) * maxY / this.totalHeight

        // 滑块位置
        thumbH.style.top = _thumbStartY + 'px'

        // tip位置
        tip.style.top = _thumbStartY + thumbH.offsetHeight / 2 - 20 + 'px'

        let maxX = scrollWbar.offsetWidth - thumbW.offsetWidth

        if (this.totalWidth > 0) {
          if (this.currentLeft < -this.totalWidth / 2) {
            this.currentLeft = -this.totalWidth / 2
          } else if (this.currentLeft > this.totalWidth / 2) {
            this.currentLeft = this.totalWidth / 2
          }
        } else {
          this.currentLeft = 0
        }

        // 水平滑块的位置
        thumbW.style.left = maxX * this.currentLeft / this.totalWidth + maxX / 2 + 'px'
      },
      async stagescroll (isScroll = false) {
        try {
          this.activePage(this.currentPage)
          if (isScroll) {
            this.isLoading = true
            await this.cacheImage()
            this.isLoading = false
            this.loadPages()
            this.updatePages()
          } else {
            this.cacheImage()
            this.loadPages()
            this.updatePages()
          }
        } catch (e) {
          console.error(e)
        }
      },
      WbarScroll (evt) {
        let thumbW = this.$refs.thumbW
        let scrollWbar = this.$refs.scrollWbar
        let thumbStartX = Number(thumbW.offsetLeft)
        let mouseStartX = evt.screenX
        let maxX = scrollWbar.offsetWidth - thumbW.offsetWidth

        let pointermove = evt => {
          let deltaX = evt.screenX - mouseStartX
          let _thumbStartX = thumbStartX + deltaX
          if (_thumbStartX < 0) {
            _thumbStartX = 0
          } else if (_thumbStartX > maxX) {
            _thumbStartX = maxX
          }
          thumbW.style.left = _thumbStartX + 'px'

          this.currentLeft = _thumbStartX / maxX * this.totalWidth - this.totalWidth / 2

          this.stagescroll()
        }
        let pointerup = evt => {
          window.removeEventListener('pointermove', pointermove)
          window.removeEventListener('pointerup', pointerup)
        }
        window.addEventListener('pointerup', pointerup)
        window.addEventListener('pointermove', pointermove)
      },
      HbarScroll (evt) {
        // let stage = this.$refs.stage
        let thumbH = this.$refs.thumbH
        let scrollHbar = this.$refs.scrollHbar
        let thumbStartY = Number(thumbH.offsetTop)
        let mouseStartY = evt.screenY
        let maxY = scrollHbar.offsetHeight - thumbH.offsetHeight

        let pointermove = evt => {
          let deltaY = evt.screenY - mouseStartY
          let _thumbStartY = thumbStartY + deltaY
          if (_thumbStartY < 0) {
            _thumbStartY = 0
          } else if (_thumbStartY > maxY) {
            _thumbStartY = maxY
          }
          thumbH.style.top = _thumbStartY + 'px'

          let tip = this.$refs.tip

          tip.style.top = _thumbStartY + thumbH.offsetHeight / 2 - 20 + 'px'

          this.currentTop = this.totalHeight * _thumbStartY / maxY + this.minTop

          // this.stagescroll()
        }
        let pointerup = evt => {
          window.removeEventListener('pointermove', pointermove)
          window.removeEventListener('pointerup', pointerup)

          this.stagescroll(true)
        }
        window.addEventListener('pointerup', pointerup)
        window.addEventListener('pointermove', pointermove)
      },
      refreshThumbStyle () {
        this.$nextTick(() => {
          let width = this.stage.width()
          let height = this.stage.height()
          let scrollHbar = this.$refs.scrollHbar
          let thumbH = this.$refs.thumbH
          if (!scrollHbar || !thumbH) return
          let _h = scrollHbar.offsetHeight
          this.currentTop = this.totalHeight * this.oldProgress + this.minTop
          if (this.totalCount) _h = height / (this.stageSize.height * this.scale * this.totalCount) * scrollHbar.offsetHeight
          thumbH.style.height = '0'
          if (_h < scrollHbar.offsetHeight) thumbH.style.height = _h + 'px'

          // 水平滚动条
          let scrollWbar = this.$refs.scrollWbar
          let thumbW = this.$refs.thumbW
          let _w = scrollWbar.offsetWidth
          if (this.totalCount) _w = width / (this.stageSize.width * this.scale) * scrollWbar.offsetWidth
          thumbW.style.width = '0'
          if (_w < scrollWbar.offsetWidth) {
            thumbW.style.width = _w + 'px'
          } else {
            this.currentLeft = 0
          }

          this.locateScrollBarPosition()
          this.stagescroll()
        })
      },
      skipPage (page) {
        consoleLog('skipPage', `跳转到 ${page}`)
        // this.currentTop = this.totalHeight * (page - 1) / (this.totalCount - 1) + this.viewHeight
        this.currentTop = this.stageSize.height * page + this.minTop
        this.stagescroll(true)
        let scrollHbar = this.$refs.scrollHbar
        let thumbH = this.$refs.thumbH
        let top = (scrollHbar.offsetHeight - thumbH.offsetHeight) * this.currentTop / this.totalHeight

        thumbH.style.top = top + 'px'
      },
      getImage (page) {
        return new Promise((resolve, reject) => {
          let cache = this.cacheList.find(item => item.page === page)
          if (cache) return resolve(cache.img)
          let config = this.imageList.find(item => item.page === page)
          if (!config) return resolve(null)
          let img = new Image()
          img.src = config.src
          img.onload = evt => {
            resolve(img)
          }
        })
      },
      async loadPage (page) {
        try {
          if (page < 0) return false
          let shape = this.stage.findOne(`.${page}`)
          if (shape) {
            consoleLog('loadPage', `存在 ${shape.name()}`, page)
            return false
          }
          let config = this.imageList.find(item => item.page === page)
          if (config && !this.loading[config.page]) {
            consoleLog('loadPage', `加载新页 ${page}`)
            config.config = config.config || {}
            let img = await this.getImage(page)
            if (img) {
              // 加载图片
              let shape = new Konva.Group({
                x: -this.currentLeft,
                y: -this.currentTop + this.stageSize.height * config.page,
                offsetX: this.stageSize.width / 2,
                offsetY: this.stageSize.height / 2,
                width: this.stageSize.width,
                height: this.stageSize.height,
                name: `${config.page}`,
                ...config.config
              })

              let _img = new Konva.Image({
                x: 0,
                y: 0,
                image: img,
                width: this.stageSize.width,
                height: this.stageSize.height
              })
              shape.add(_img)

              this.imageLayer.add(shape).draw()
            }
            return true
          }
          return false
        } catch (e) {
          console.error(e)
        }
      },
      // addEventListener () {
      //   let firstWord = ''
      //   let isDown = false
      //
      //   let pointerdown = evt => {
      //     consoleLog('addEventListener', this.stage.getPointerPosition())
      //     this.stage.find('.selection').map(child => child.destroy())
      //     this.imageLayer.draw()
      //     firstWord = this.getCurrentWord()
      //     // if (firstWord) consoleLog('鼠标选中的文字', firstWord.text, firstWord)
      //
      //     isDown = true
      //   }
      //   let pointermove = evt => {
      //     let currentWord = this.getCurrentWord()
      //     if (!isDown) {
      //       if (currentWord) {
      //         document.body.style.cursor = 'text'
      //       } else {
      //         document.body.style.cursor = 'default'
      //       }
      //       return
      //     }
      //     if (!currentWord) return
      //     if (!firstWord) firstWord = currentWord
      //
      //     let allWords = this.getAllWordsFromWordA2WordB(firstWord, currentWord)
      //     let names = Object.keys(allWords)
      //     this.stage.find('.selection').map(child => {
      //       if (names.indexOf(child.id()) === -1) {
      //         child.destroy()
      //       }
      //     })
      //     names.map(name => {
      //       let shape = this.stage.findOne(`#${name}`)
      //       if (shape) {
      //         shape.setAttrs({
      //           x: allWords[name].x,
      //           y: allWords[name].y,
      //           width: allWords[name].width,
      //           height: allWords[name].height,
      //           text: allWords[name].text
      //         })
      //       } else {
      //         let group = this.stage.findOne(`.${allWords[name].page}`)
      //         shape = new Konva.Rect({
      //           x: allWords[name].x,
      //           y: allWords[name].y,
      //           width: allWords[name].width,
      //           height: allWords[name].height,
      //           fill: '#3390ff',
      //           listening: false,
      //           id: name,
      //           name: 'selection',
      //           opacity: 0.2,
      //           text: allWords[name].text
      //         })
      //         group.add(shape).draw()
      //       }
      //     })
      //     this.imageLayer.draw()
      //   }
      //   let pointerup = evt => {
      //     isDown = false
      //     let selectText = ''
      //     this.stage.find('.selection').map((child, index) => {
      //       if (index) selectText += `\n`
      //       selectText += child.getAttr('text')
      //     })
      //     if (selectText) {
      //       console.log(selectText)
      //     }
      //   }
      //
      //   this.stage.on('contentTouchstart contentTouchmove contentTouchend', evt => {
      //     if (evt.evt.targetTouches.length !== 1) return
      //     let touch = evt.evt.targetTouches[0]
      //     if (touch.radiusX !== 0.5 || touch.radiusY !== 0.5) return
      //     if (evt.type === 'contentTouchstart') {
      //       pointerdown(evt)
      //     } else if (evt.type === 'contentTouchmove') {
      //       pointermove(evt)
      //     } else if (evt.type === 'contentTouchend') {
      //       pointerup(evt)
      //     }
      //   })
      //   this.stage.on('contentMousedown contentMousemove contentMouseup', evt => {
      //     if (evt.type === 'contentMousedown') {
      //       pointerdown(evt)
      //     } else if (evt.type === 'contentMousemove') {
      //       pointermove(evt)
      //     } else if (evt.type === 'contentMouseup') {
      //       pointerup(evt)
      //     }
      //   })
      // },
      getAllWordsFromWordA2WordB (A, B) {
        if (A.pageIndex > B.pageIndex) {
          [A, B] = [B, A]
        } else if (A.pageIndex === B.pageIndex) {
          if (A.index > B.index) {
            [A, B] = [B, A]
          }
        }
        let _rows = {}

        // AB之间的页
        for (let i = A.pageIndex; i <= B.pageIndex; i++) {
          let text = this.textList.find(item => item.page === i)
          let start = 0
          let end = text.words.length - 1
          if (i === A.pageIndex && i === B.pageIndex) {
            start = A.index
            end = B.index
          } else if (i === A.pageIndex) {
            start = A.index
          } else if (i === B.pageIndex) {
            end = B.index
          }
          for (let j = start; j <= end; j++) {
            let word = text.words[j]
            let name = `selection${word.pageIndex}${word.rowIndex}`
            if (!_rows[name]) {
              _rows[name] = {
                page: word.pageIndex,
                x: word.x1,
                y: word.y1,
                width: 0,
                height: 0,
                text: ''
              }
            }
            _rows[name].width = word.x2 - _rows[name].x
            _rows[name].height = word.y2 - _rows[name].y
            _rows[name].text += word.text
          }
        }
        return _rows
      },
      getCurrentWord () {
        let currtntShape = this.getCurrtntShape()
        if (!currtntShape) return
        let page
        if (currtntShape.className === 'Image') {
          page = Number(currtntShape.parent.name())
        } else {
          page = Number(currtntShape.name())
        }
        let text = this.textList.find(item => item.page === page)
        if (!text) return
        if (!text.words) text.words = []
        if (!text.rows) text.rows = []

        let pointerPositionInImage = this.getPointerPositionInImage()

        // let rotation = this.stage.findOne(`.${page}`).rotation()

        // rotation = -rotation * Math.PI / 180

        // let a = this.stageSize.width / 2
        // let b = this.stageSize.height / 2
        // offsetX: this.stageSize.width / 2,
        //   offsetY: this.stageSize.height / 2,

        // consoleLog('前', pointerPositionInImage)
        //
        // pointerPositionInImage.x = (pointerPositionInImage.x - a) * Math.cos(rotation) + (pointerPositionInImage.y - b) * Math.sin(rotation) + a
        // pointerPositionInImage.y = -(pointerPositionInImage.x - a) * Math.sin(rotation) + (pointerPositionInImage.y - b) * Math.cos(rotation) + b
        // // pointerPositionInImage.x = pointerPositionInImage.x * Math.cos(rotation) - pointerPositionInImage.y * Math.sin(rotation)
        // // pointerPositionInImage.y = pointerPositionInImage.x * Math.sin(rotation) + pointerPositionInImage.y * Math.cos(rotation)
        //
        // consoleLog('后', pointerPositionInImage)

        // word.x1 = word.x1 * Math.cos(rotation) - word.y1 * Math.sin(rotation)
        // word.x2 = word.x2 * Math.cos(rotation) - word.y2 * Math.sin(rotation)
        // word.y1 = word.x1 * Math.sin(rotation) + word.y1 * Math.cos(rotation)
        // word.y2 = word.x2 * Math.sin(rotation) + word.y2 * Math.cos(rotation)

        let prevRowIndex = -1
        let minLineHeight = this.stageSize.height
        for (let word of text.words) {
          // word.x1 = word.x1 * Math.cos(rotation) - word.y1 * Math.sin(rotation)
          // word.x2 = word.x2 * Math.cos(rotation) - word.y2 * Math.sin(rotation)
          // word.y1 = word.x1 * Math.sin(rotation) + word.y1 * Math.cos(rotation)
          // word.y2 = word.x2 * Math.sin(rotation) + word.y2 * Math.cos(rotation)
          // 行内
          if (pointerPositionInImage.y >= word.y1 && pointerPositionInImage.y <= word.y2) {
            prevRowIndex = word.rowIndex
            break
          } else {
            // 判断最小间隙
            if (prevRowIndex !== word.rowIndex) {
              // 换行了
              if (pointerPositionInImage.y - word.y2 > 0) {
                // 鼠标上面
                if (pointerPositionInImage.y - word.y2 < minLineHeight) {
                  minLineHeight = pointerPositionInImage.y - word.y2
                  prevRowIndex = word.rowIndex
                }
              } else if (word.y1 - pointerPositionInImage.y > 0) {
                // 鼠标下面
                if (word.y1 - pointerPositionInImage.y < minLineHeight) {
                  minLineHeight = word.y1 - pointerPositionInImage.y
                  prevRowIndex = word.rowIndex
                }
              }
            }
          }
        }
        // 文字行prevRowIndex

        let words = text.rows[prevRowIndex] || []
        for (let word of words) {
          // word.x1 = word.x1 * Math.cos(rotation) - word.y1 * Math.sin(rotation)
          // word.x2 = word.x2 * Math.cos(rotation) - word.y2 * Math.sin(rotation)
          // word.y1 = word.x1 * Math.sin(rotation) + word.y1 * Math.cos(rotation)
          // word.y2 = word.x2 * Math.sin(rotation) + word.y2 * Math.cos(rotation)
          if (pointerPositionInImage.x < word.x1 && word.wordIndex === 0) {
            // console.log('最左边', word)
            return word
          } else if (pointerPositionInImage.x > word.x2 && word.wordIndex === text.rows[prevRowIndex].length - 1) {
            // console.log('最右边', word)
            return word
          } else if (pointerPositionInImage.x >= word.x1 && pointerPositionInImage.x <= word.x2) {
            // console.log('字上面', word)
            return word
          }
        }
        return {}
      },
      getPointerPositionInImage () {
        let currtntShape = this.getCurrtntShape()
        if (!currtntShape) return
        if (currtntShape.className === 'Image') currtntShape = currtntShape.parent
        // let pointerPosition = this.getPointerPosition()

        let pointerPosition = this.gePointerPositionReferToCanvasCenter()

        let rotation = currtntShape.rotation()

        let cx = currtntShape.x()
        let cy = currtntShape.y()

        if (rotation < 0) {
          rotation += 360
        } else if (rotation >= 360) rotation -= 360

        if (rotation === 0) {
        } else if (rotation === 90) {
          cx = cy
          cy = 0
        } else if (rotation === 180) {
          cy = -cy
        } else if (rotation === 270) {
          cx = -cy
          cy = 0
        }

        rotation = rotation * Math.PI / 180

        let x = pointerPosition.x
        let y = pointerPosition.y

        pointerPosition.x = (x) * Math.cos(rotation) + (y) * Math.sin(rotation)
        pointerPosition.y = -(x) * Math.sin(rotation) + (y) * Math.cos(rotation)

        let newPos = {
          x: pointerPosition.x / this.scale + currtntShape.offsetX() - cx,
          y: pointerPosition.y / this.scale + currtntShape.offsetY() - cy
        }

        // x: 4289.010934393638, y: 247.1888667992048 右上角

        console.log('newPos', newPos)

        return newPos
      },
      getCurrtntShape () {
        let pointerPosition = this.getPointerPosition()
        let currtntShape = this.stage.getIntersection(pointerPosition)

        if (!currtntShape) {
          let delta = pointerPosition.y + this.currentTop * this.scale
          let page = 0
          while ((delta -= this.stageSize.height * this.scale) > 0) page++

          currtntShape = this.stage.findOne(`.${page}`)
        }

        return currtntShape
      },
      async loadPages () {
        try {
          this.destroyPages()
          let end = this.currentPage + Math.ceil(this.cacheCount / 2)
          let start = end - this.cacheCount
          consoleLog('loadPages', `开始缓存页面 ${start} 到 ${end}`)
          let succ = []
          for (let i = start; i < end; i++) {
            let page = this.stage.findOne(`.${i}`)
            if (page) continue
            let res = await this.loadPage(i)
            if (res) succ.push(i)
          }
          consoleLog('loadPages', `页面缓存结束 共缓存成功 ${succ.length} 个`, succ)
        } catch (e) {
          console.error(e)
        }
      },
      destroyPages () {
        // 有需要加载的页面，就说明有需要销毁的页面
        let end = this.currentPage + Math.ceil(this.cacheCount / 2)
        let start = end - this.cacheCount
        consoleLog('destroyPages', `开始销毁 ${start} 到 ${end} 之外的页面`)
        for (let i = 0; i < this.totalCount; i++) {
          let isFirst = true
          // 销毁图片层
          if (i >= start && i < end) isFirst = false
          let res = this.stage.find(`.${i}`)
          res.map(item => {
            if (!isFirst) return (isFirst = true)
            consoleLog('destroyPages', `销毁图片 ${item.name()}`)
            item.destroy()
          })
          // 销毁文字层
          if (i >= start && i < end) isFirst = false
          let texts = this.stage.find(`.text${i}`)
          texts.map(item => {
            if (!isFirst) return (isFirst = true)
            consoleLog('destroyPages', `销毁文字 ${item.name()}`)
            item.destroy()
          })
        }
        this.imageLayer.draw()
      },
      updatePages () {
        let end = this.currentPage + Math.ceil(this.cacheCount / 2)
        let start = end - this.cacheCount
        consoleLog('updatePages', `开始更新页面 ${start} 到 ${end}`)
        for (let i = start; i < end; i++) {
          let page = this.stage.findOne(`.${i}`)
          if (page) {
            page.setAttrs({
              x: -this.currentLeft,
              y: -this.currentTop + this.stageSize.height * i
            })
            this.imageLayer.draw()
          }
        }

        let ids = this.imageLayer.children.map(item => item.name())
        consoleLog('updatePages', '当前图片数量', ids)
      },
      initData () {
        consoleLog('initData', '初始化数据')
        let baseurl = 'static/baidu_pdf'
        let files = fs.readdirSync(baseurl)
        files.sort((a, b) => Number(a) - Number(b))
        files.map(fileName => {
          this.imageList.push({
            page: this.imageList.length,
            src: `${baseurl}/${fileName}/pic.jpg`
          })
        })
        consoleLog('initData', '初始化数据完成', this.imageList.length)
      },
      async cacheImage () {
        try {
          let end = this.currentPage + Math.ceil(this.cacheListCount / 2)
          let start = end - this.cacheListCount
          let succ = []
          consoleLog('cacheImage', `开始缓存图片 ${start} 到 ${end}`)
          this.cacheList = this.cacheList.filter(item => item.page >= start && item.page <= end)

          this.textList = this.textList.filter(item => item.page >= start && item.page <= end)

          for (let i = 0; i < this.totalCount; i++) {
            if (i < start || i >= end) continue
            let config = this.imageList.find(item => item.page === i)
            if (!config) continue
            let cache = this.cacheList.find(item => {
              if (item === undefined) console.log(item, this.cacheList)
              return item.page === i
            })
            if (cache) continue
            let img = await this.initImage('/' + config.src)
            this.cacheList.push({
              page: i,
              img
            })
            succ.push(i)

            // 缓存文本
            let src = config.src

            src = src.replace(new RegExp(path.extname(src) + '$'), '.txt')

            let text = fs.readFileSync(src, 'utf8').toString()

            // let strData = text.replace(/\s+/g, ' ').split('*')

            let zoom = this.stageSize.width / fixwidth
            let rows = text.split(/\n/)
            let index = -1
            let words = []
            let _rows = []
            rows.map((row, rowIndex) => {
              if (!row) return
              let _rowWords = []
              let rowWords = row.replace(/\s+/g, ' ').split('*')
              rowWords.map((word, wordIndex) => {
                let temp = word.split(/\s/)
                if (temp.length < 4) return
                index++
                let _word = {
                  pageIndex: i,
                  rowIndex: rowIndex,
                  wordIndex: wordIndex,
                  index: index,
                  x1: Number(temp[0]) * zoom,
                  y1: Number(temp[1]) * zoom,
                  x2: Number(temp[2]) * zoom,
                  y2: Number(temp[3]) * zoom,
                  text: temp[4]
                }
                words.push(_word)
                _rowWords.push(_word)
              })
              _rows.push(_rowWords)
            })

            this.textList.push({
              page: i,
              words: words,
              rows: _rows
            })
          }
          consoleLog('cacheImage', `缓存结束：本次共缓存 ${succ.length} 张图片`, succ)
          consoleLog('cacheImage', 'over============================================================')
        } catch (e) {
          console.error(e)
        }
      },
      initImage (src) {
        return new Promise((resolve, reject) => {
          let image = new window.Image()
          image.src = src
          // consoleLog('initImage', `加载图片: ${src}`)
          image.onload = () => {
            if (!this.stageSize.width || !this.stageSize.height) {
              this.stageSize.width = image.width
              this.stageSize.height = image.height
            }
            resolve(image)
          }
        })
      },
      handleResize (type = 'page') {
        this.type = type
        let stage = document.querySelector('.stage')
        let width = stage.offsetWidth
        let height = stage.offsetHeight
        if (type === 'screen') {
          this.scale = width / this.stageSize.width
        } else if (type === 'page') {
          this.scale = height / this.stageSize.height
        } else if (type === 'original') {
          this.scale = 1
        }
        this.stage.setAttrs({
          height: height,
          width: width
        }).draw()

        this.changeScale()
      },
      changeScale () {
        if (this.scale < this.minScale) {
          this.scale = this.minScale
        } else if (this.scale > this.maxScale) this.scale = this.maxScale

        this.minTop = -this.stageSize.height / 2 + this.stage.height() / this.scale / 2
        this.maxTop = this.totalHeight - this.minTop

        this.stage.setAttrs({
          scale: {x: this.scale, y: this.scale},
          offsetX: -this.stage.width() / this.scale / 2,
          offsetY: -this.stage.height() / this.scale / 2
        }).draw()

        this.refreshThumbStyle()
      },
      zoomIn () {
        this.type = ''
        this.scale += 0.1
        this.changeScale()
      },
      zoomOut () {
        this.type = ''
        this.scale -= 0.1
        this.changeScale()
      },
      rotatePage (i, rotation = 0) {
        let offsetX = this.stageSize.width / 2
        let offsetY = this.stageSize.height / 2

        if (rotation < 0) {
          rotation += 360
        } else if (rotation >= 360) rotation -= 360

        if (rotation === 90) {
          console.log('横着')
          offsetX = 0
        } else if (rotation === 270) {
          console.log('横着')
          offsetX = this.stageSize.width
          // offsetX = 0
        } else if (rotation === 0) {
          offsetY = 0
        } else if (rotation === 180) {
          offsetY = this.stageSize.height
        }

        let page = this.stage.findOne(`.${i}`)
        console.log(page)
        if (page) {
          page.setAttrs({
            rotation: rotation
            // offsetX: offsetX,
            // offsetY: offsetY
          })
          this.imageLayer.draw()
        }
        console.log(offsetX, offsetY, rotation)
      },
      antiClockwise () {
        let page = this.stage.findOne(`.${this.currentPage}`)
        this.rotatePage(this.currentPage, page.getAttr('rotation') - 90)
      },
      clockwise () {
        let page = this.stage.findOne(`.${this.currentPage}`)
        this.rotatePage(this.currentPage, page.getAttr('rotation') + 90)
      },
      print () {
        console.log(this.imageLayer.children)
      }
    }
  }
</script>

<style lang="scss">
  html, body {
    margin: 0;
  }

  #app {
    height: 100vh;
    overflow: hidden;

    .btn-box {
      line-height: 30px;
      height: 30px;
      padding-left: 15px;
      border-bottom: 1px solid #ccc;

      button {
        outline: none;
        border: 1px solid #ccc;

        &.active {
          background-color: #3dc0ec;
          color: white;
        }
      }
    }

    .info-box {
      height: 30px;
      line-height: 30px;
      border-top: 1px solid #ccc;
      padding-left: 15px;
    }

    .stage_box {
      height: calc(100% - 60px);
      font-size: 0;
      position: relative;

      .stage {
        position: relative;
        display: inline-block;
        height: 100%;
        /*overflow: hidden;*/
        width: 100%;

        &::-webkit-scrollbar-thumb, &::-webkit-scrollbar {
          display: none;
        }

        .scrollHbar {
          width: 17px;
          /*background-color: #000;*/
          display: inline-block;
          position: absolute;
          overflow: hidden;
          user-select: none;
          top: 0;
          right: 0;
          bottom: 17px;
          pointer-events: none;

          .thumbH {
            pointer-events: all;
            position: absolute;
            top: 0;
            width: 17px;
            background-color: #c8c8c8;
            user-select: none;
            min-height: 1px;
            cursor: default;
          }
        }

        .scrollWbar {
          height: 17px;
          /*background-color: #000;*/
          display: inline-block;
          position: absolute;
          overflow: hidden;
          user-select: none;
          bottom: 0;
          left: 0;
          right: 17px;
          pointer-events: none;

          .thumbW {
            position: absolute;
            left: 0;
            height: 17px;
            background-color: #c8c8c8;
            user-select: none;
            min-width: 1px;
            pointer-events: all;
            cursor: default;
          }
        }

        .tip {
          position: absolute;
          top: -20px;
          right: 27px;
          height: 40px;
          width: 40px;
          background-color: #d6d6d6;
          font-size: 20px;
          text-align: center;
          line-height: 40px;
          border-radius: 50%;
          cursor: default;
          user-select: none;

          &::after {
            content: ' ';
            position: absolute;
            top: 50%;
            right: -18px;
            transform: translateY(-50%);
            height: 0;
            width: 0;
            border: 10px solid;
            border-color: transparent transparent transparent #d6d6d6;
          }
        }
      }

      .mulu {
        position: absolute;
        top: 0;
        left: -200px;
        width: 200px;
        height: 100%;
        background-color: white;
        overflow-y: auto;
        transition-duration: 500ms;

        .item {
          font-size: 14px;
          line-height: 30px;
          border-top: 1px solid #ccc;
          cursor: default;

          &:hover, &.active {
            background-color: aquamarine;
          }
        }

        &.is-show {
          left: 0;
        }
      }
    }


    .selectionToolbar {
      position: fixed;
      top: 0;
      left: 0;
      background-color: #9fe1e7;
      border-radius: 3px;
      visibility: hidden;
      border: 1px solid #ccc;
      box-sizing: border-box;

      .toolbar-item {
        display: inline-block;
        font-size: 14px;
        border-left: 1px solid #ccc;
        padding: 5px 15px;
        cursor: default;

        &:nth-child(1) {
          border-left: none;
        }

        &:hover {
          background-color: #4986e7;
          color: white;
        }
      }
    }

    #loading {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.3);

      div {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 100px;
        height: 100px;

        i {
          display: inline-block;
          height: 80px;
          width: 10px;
          border-radius: 50%;
          background-color: #41b883;
          position: absolute;

          animation: loading 2s infinite linear;
          left: 50%;
          transform: translateX(-50%);
          transform-origin: center 110%;

          @for $i from 1 to 8 {
            &:nth-child(#{$i}) {
              animation-delay: 0.25s * $i;
            }
          }
        }

        @keyframes loading {
          0% {
            transform: rotateZ(0);
          }

          25% {
            transform: rotateZ(90deg);
          }

          50% {
            transform: rotateZ(180deg);
          }

          75% {
            transform: rotateZ(270deg);
          }

          100% {
            transform: rotateZ(360deg);
          }
        }
      }
    }
  }
</style>
