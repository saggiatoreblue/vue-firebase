import Vue from 'vue'
import App from './App.vue'
import router from './router'

import { library } from '@fortawesome/fontawesome-svg-core'
import { faTrash, faPodcast, faVideo, faUser } from '@fortawesome/free-solid-svg-icons'

import WebRTC from 'vue-webrtc'
import * as io from 'socket.io'

library.add(faTrash, faPodcast, faVideo, faUser)

window.io = io

Vue.config.productionTip = false

Vue.use(WebRTC)

new Vue({
  router,
  render: h => h(App)
}).$mount('#app')
