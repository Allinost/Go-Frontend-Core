import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import { createAuthGuard } from './router/guard'
import { install as installNkui } from '@nkui/vue'
import App from './App.vue'
import './styles/_theme.css'
import './styles/global.scss'
import './styles/development-manager.scss'

const app = createApp(App)

app.use(createPinia())
app.use(router)
installNkui(app)

createAuthGuard(router)

app.mount('#app')
