<template>
  <div >
    <!-- <button >测试</button> -->
    <img ondragstart='return false' @mousedown="controlmousedown" @mouseup="controlmouseup" @mousemove="controlmousemove" :src="imagebuffer" />
  </div>
</template>

<script>
  const { ipcRenderer } = require('electron')
  export default {
    name: 'control-page',
    data(){
      return {
        testNum:0,
        imagebuffer:"https://ss0.bdstatic.com/5aV1bjqh_Q23odCf/static/superman/img/logo_top_86d58ae1.png"
      }
    },
    created(){
      ipcRenderer.on("image", (event, arg) => {
        this.imagebuffer = "data:image/jpeg;base64,"+arg
        //console.log(arg)
      })
    },
    methods: {
      controlmousedown(e){
        let arg = {
          type: "mouseDown",
          x:e.clientX,
          y:e.clientY,
          button:e.button == 0?'left':'right', 
          clickCount: 1
      }
      ipcRenderer.send('control',arg)
        
      },
      controlmouseup(e){
          let arg = {
            type: "mouseUp",
            x:e.clientX,
            y:e.clientY,
            button:e.button == 0?'left':'right', 
            clickCount: 1
        }
        ipcRenderer.send('control',arg)
        
      },
      controlmousemove(e){
          let arg = {
            type: "mouseMove",
            x:e.clientX,
            y:e.clientY,
            button:e.button == 0?'left':'right', 
            clickCount: 1
        }
        ipcRenderer.send('control',arg)
        
      }
    }
  }
</script>

<style>
  
</style>
