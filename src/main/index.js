import { app, BrowserWindow, ipcMain } from 'electron'
import Websocket from 'ws'


/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
  global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}

let mainWindow, controlWindow
const winURL = process.env.NODE_ENV === 'development'
  ? `http://localhost:9080`
  : `file://${__dirname}/index.html`

function createWindow() {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    height: 1000,
    useContentSize: true,
    width: 1920,
    webPreferences: {
      offscreen: true
    },
    fullscreen: false
  })

<<<<<<< HEAD
  mainWindow.webContents.setFrameRate(1)
=======
  //设置帧率
  mainWindow.webContents.setFrameRate(30)
>>>>>>> 1bda7c379990c8ee7b9421585f94421481f68c81

  mainWindow.webContents.on('paint', (event, dirty, image) => {
    let buffer = image.toJPEG(80)
    let base64 = buffer.toString("base64")
<<<<<<< HEAD
    controlWindow.webContents.send('image', base64)
    console.log(dirty)
=======
    controlWindow.webContents.send('image',base64)
    //console.log(dirty)
>>>>>>> 1bda7c379990c8ee7b9421585f94421481f68c81
  })

  controlWindow = new BrowserWindow({
    height: 1000,
    useContentSize: true,
    width: 1920,
    fullscreen: false
  })

  mainWindow.loadURL("https://github.com/websockets/ws#sending-binary-data")
  controlWindow.loadURL(winURL + "#controlpage")

  mainWindow.on('closed', () => {
    mainWindow = null
  })
  mainWindow.hide()
  ipcMain.on("control", (event, arg) => {



    // mainWindow.webContents.sendInputEvent({type: 'keyDown', keyCode: 'c'})
    // mainWindow.webContents.sendInputEvent({type: 'char', keyCode: 'c'})

    mainWindow.webContents.sendInputEvent(arg)
    //console.log(e)
  })

}

app.on('ready', createWindow)

let conter = 0

let websocket = new Websocket(`ws://127.0.0.1:5000/Eink`)

websocket.on('open', function () {
  console.log('opened')
  let rdata = CreateRequestBuffer(7)
  websocket.send(rdata)
});

websocket.on('message', function (data) {
  console.log(data)
  if (data &&
    Buffer.isBuffer(data) &&
    data.length > 7
    && data[0] == 0xaa) {
    //接受消息
    switch (data[1]) {
      //心跳
      case 1:
        //回复心跳
        let rdata = CreateRequestBuffer(1)
        websocket.send(rdata)
        break;
      
    }

  }

});

//创建报文
function CreateRequestBuffer(comm, Content) {
  let conterHex = conter.toString(16)
  conterHex = conterHex.length % 2 == 0 ? conterHex : '0' + conterHex
  conterHex = conterHex.length > 2 ? conterHex : '00' + conterHex
  let rdata = Buffer.from("aa01000000000000", "hex")
  let cnt = Buffer.from(conterHex, "hex")
  rdata[1] = comm
  cnt.copy(rdata, 2, cnt.length - 2, cnt.length)
  if(Content && Content.length > 0){

  }
  conter++
  return rdata
}


// app.once('ready', () => {
//   const win = new BrowserWindow()
//   win.loadURL('https://gmail.com')

//   win.webContents.once('did-finish-load', () => {
//     // Compose
//     setTimeout(() => {
//       console.log('compose...')
//       win.webContents.sendInputEvent({type: 'keyDown', keyCode: 'c'})
//       win.webContents.sendInputEvent({type: 'char', keyCode: 'c'})
//     }, 1000)
//     // Cancel Compose
//     setTimeout(() => {
//       console.log('cancel...')
//       win.webContents.sendInputEvent({type: 'keyDown', keyCode: 'escape'})
//       win.webContents.sendInputEvent({type: 'char', keyCode: 'escape'})
//     }, 2000)
//     // Go to Tasks
//     setTimeout(() => {
//       console.log('go to tasks...')
//       win.webContents.sendInputEvent({type: 'keyDown', keyCode: 'g'})
//       win.webContents.sendInputEvent({type: 'char', keyCode: 'g'})
//       win.webContents.sendInputEvent({type: 'keyDown', keyCode: 'k'})
//       win.webContents.sendInputEvent({type: 'char', keyCode: 'k'})
//     }, 3000)
//   })
// })


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

/**
 * Auto Updater
 *
 * Uncomment the following code below and install `electron-updater` to
 * support auto updating. Code Signing with a valid certificate is required.
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-electron-builder.html#auto-updating
 */

/*
import { autoUpdater } from 'electron-updater'

autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall()
})

app.on('ready', () => {
  if (process.env.NODE_ENV === 'production') autoUpdater.checkForUpdates()
})
 */