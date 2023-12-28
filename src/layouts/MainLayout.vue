<template>
  <q-layout view="lHh Lpr lFf">
    <q-header class="bg-white text-grey-10" bordered>
      <q-toolbar class="constrain">
        <q-btn to="/camera" flat round dense icon="eva-camera-outline" size="18px" class="large-screen-only q-mr-sm" />
        <q-separator class="large-screen-only" vertical spaced />
        <q-toolbar-title class="text-grand-hotel text-bold">
          InGram
        </q-toolbar-title>
        <q-btn to="/" flat round dense icon="eva-home-outline" size="18px" class="large-screen-only" />
      </q-toolbar>
    </q-header>

    <q-footer class="bg-white" bordered>
      <transition apper enter-active-class="animated fadeIn" leave-active-class="animated fadeOut">
        <div v-if="showAppInstallBanner" class="banner-container bg-primary">
          <div class="constrain">
            <q-banner inline-actions class="bg-primary text-white">
              <template>
                <q-avatar color="white" text-color="grey-10" icon="eva-camera-outline" font-size="22px" />
              </template>
              <b>
                Ingram
              </b>
              <template v-slot:action>
                <q-btn @click="installApp" dense class="q-px-sm" flat label="Yes" />
                <q-btn @click="showAppInstallBanner = false" dense class="q-px-sm" flat label="Later" />
                <q-btn @click="neverShowAppInstallBanner" dense class="q-px-sm" flat label="Never" />
              </template>
            </q-banner>
          </div>
        </div>
      </transition>

      <q-tabs class="text-grey-10 small-screen-only" active-color="primary" indicator-color="transparent">
        <q-route-tab to="/" icon="eva-home-outline" />
        <q-route-tab to="/camera" icon="eva-camera-outline" />
      </q-tabs>
    </q-footer>

    <q-page-container class="bg-grey-1">
      <keep-alive :include="['PageHome']">
        <router-view />
      </keep-alive>
    </q-page-container>
  </q-layout>
</template>

<script>
let deferredPrompt;

export default {
  name: 'MainLayout',
  data () {
    return {
      showAppInstallBanner: false
    }
  },
  methods: {
    installApp() {
      this.showAppInstallBanner = false;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult === 'accepted') {
          console.log('accepted');
        } else {
          console.log('declined');
        }
      })
    },
    neverShowAppInstallBanner() {
      this.showAppInstallBanner = false;
      this.$q.localStorage.set('neverShowAppInstallBanner', true);
    }
  },
  mounted() {
    let neverShowAppInstallBanner = this.$q.localStorage.getItem('neverShowAppInstallBanner');

    if (!neverShowAppInstallBanner) {
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        setTimeout(() => {
          this.showAppInstallBanner = true;
        },3000)
      })
    }
  }
}
</script>

<style lang="sass">
  .q-toolbar
    @media (min-width: $breakpoint-sm-min)
      height: 77px
  .q-toolbar__title
    font-size: 32px
    @media (max-width: $breakpoint-xs-max)
      text-align: center

  .q-footer
    .q-tab__icon
      font-size: 30px

</style>
