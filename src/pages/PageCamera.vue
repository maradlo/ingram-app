<template>
  <q-page class="constrain-more q-pa-md">
    <div class="camera-frame q-pa-md">
      <video v-show="!imageCaptured" class="full-width" autoplay ref="video" />
      <canvas
        v-show="imageCaptured"
        ref="canvas"
        class="full-width"
        height="240"
      />
    </div>

    <div class="text-center q-pa-md">
      <q-btn v-if="hasCameraSupport" :disabled="imageCaptured" @click="captureImage" size="lg" round color="grey-10" icon="eva-camera" />
      <q-file v-else outlined v-model="imageUpload" accept="image/*" label="Choose an image" @input="captureImageFallback">
        <template v-slot:prepend>
          <q-icon name="eva-attach-outline" />
        </template>
      </q-file>
      <div class="row justify-center q-ma-md">
        <q-input class="col col-sm-6" v-model="post.caption" label="Caption *" dense />
      </div>

      <div class="row justify-center q-ma-md">
        <q-input class="col col-sm-6" v-model="post.location" label="Location" dense :loading="locationLoading">
          <template v-slot:append>
            <q-btn v-if="!locationLoading && locationSupported" @click="getLocation" round dense flat icon="eva-navigation-2-outline" />
          </template>
        </q-input>
      </div>

      <div class="row justify-center q-mt-lg">
        <q-btn @click="addPost" :disabled="!post.caption || !post.photo" unelevated rounded color="primary" label="Post Image" />
      </div>
    </div>
  </q-page>
</template>

<script>
import { uid } from 'quasar';
require('md-gum-polyfill');

export default {
  name: 'PageCamera',
  data() {
    return {
      post: {
        id: uid(),
        caption: '',
        location: '',
        photo: null,
        date: Date.now()
      },
      imageCaptured: false,
      imageUpload: [],
      hasCameraSupport: true,
      locationLoading: false
    }
  },
  computed: {
    locationSupported() {
      if ('geolocation' in navigator) return true;
      return false;
    },
    backgroundSyncSupported() {
      if ('serviceWorker' in navigator && 'SyncManager' in window) return true
      return false
    }
  },
  methods: {
    initCamera() {
      navigator.mediaDevices.getUserMedia({
        video: true
      }).then(stream => {
        this.$refs.video.srcObject = stream;
      }).catch(error => {
        this.hasCameraSupport = false;
      })
    },
    captureImage() {
      let video = this.$refs.video;
      let canvas = this.$refs.canvas;
      canvas.width = video.getBoundingClientRect().width;
      canvas.height = video.getBoundingClientRect().height;
      let context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      this.imageCaptured = true;
      this.post.photo = this.dataURItoBlob(canvas.toDataURL());
      this.disableCamera();
    },
    captureImageFallback(file) {
      this.post.photo = file;
      let canvas = this.$refs.canvas;
      let context = canvas.getContext('2d');
      var reader = new FileReader();

      reader.onload = event => {
        var img = new Image();
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          context.drawImage(img, 0, 0);
          this.imageCaptured = true;
        }
        img.src = event.target.result;
      }
      reader.readAsDataURL(file);
    },
    disableCamera() {
      this.$refs.video.srcObject.getVideoTracks().forEach(track => {
        track.stop();
      })
    },
    dataURItoBlob(dataURI) {
      var byteString = atob(dataURI.split(',')[1]);
      var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]
      var ab = new ArrayBuffer(byteString.length);
      var ia = new Uint8Array(ab);
      for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      var blob = new Blob([ab], {type: mimeString});
      return blob;
    },
    getLocation() {
      this.locationLoading = true;
      navigator.geolocation.getCurrentPosition(position => {
        this.getCityAndCountry(position);
      }, err => {
        this.locationError();
      }, {
        timeout: 7000
      })
    },
    getCityAndCountry(position) {
      let apiUrl = `https://geocode.xyz/${position.coords.latitude},${position.coords.longitude}?json=1`;
      this.$axios.get(apiUrl).then(result => {
        this.locationSuccess(result);
      }).catch(err => {
        this.locationError();
      });
    },
    locationSuccess(result) {
      this.post.location = result.data.city
      if (result.data.country) {
        this.post.location += `, ${result.data.country}`
      }
      this.locationLoading = false;
    },
    locationError() {
      this.$q.dialog({
        title: 'Error',
        message: 'Could not find your location'
      })
      this.locationLoading = false;
    },
    addPost() {
      this.$q.loading.show();
      let formData = new FormData();
      formData.append('id', this.post.id);
      formData.append('caption', this.post.caption);
      formData.append('location', this.post.location);
      formData.append('date', this.post.date);
      formData.append('file', this.post.photo, this.post.id + '.png');

      this.$axios.post(`${process.env.API_URL}/createPost`, formData).then(response => {
        this.$router.push('/');
        this.$q.notify({
          message: 'Post created!',
          actions: [
            { label: 'Dismiss', color: 'white'}
          ]
        })
        this.$q.loading.hide();
      }).catch(err => {
        if (!navigator.onLine && this.backgroundSyncSupported) {
          this.$q.notify('Post created offline')
          this.$router.push('/')
        } else {
          this.$q.dialog({
            title: 'Error',
            message: 'Sorry, could not create post!'
          })
        }
        this.$q.loading.hide();
      })
    },
  },
  mounted() {
    this.initCamera();
  },
  beforeDestroy() {
    if (this.hasCameraSupport) this.disableCamera();
  }
}
</script>

<style lang="sass">
  .camera-frame
    border: 2px solid $grey-10
    border-radius: 10px
</style>
