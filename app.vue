<template lang="pug">
u-container(class="py-3 sm:py-6 lg:py-8")
  .window
    .window-top-bar
      .window-top-bar-buttons
        .red
        .yellow
        .green
      .window-top-bar-title Conpilot 1.0
    .window-content
      monaco-editor.window-content-editor(
        v-model="code"
        :options="{ theme: 'vs-dark', tabSize: 2 }"
        lang="typescript"
      )
</template>

<script>
import { useLocalStorage, useDebounceFn } from '@vueuse/core'

const TTS = {
  voice: 'Google UK English Female',
  pitch: 1.0,
  rate: 1.1,
  volume: 1
}

const makeCunksOfText = (text) => {
  const maxLength = 180
  let speechChunks = []

  // Split the text into chunks of maximum length maxLength without breaking words
  while (text.length > 0) {
    if (text.length <= maxLength) {
      speechChunks.push(text)
      break
    }

    let chunk = text.substring(0, maxLength + 1)

    let lastSpaceIndex = chunk.lastIndexOf(' ')
    if (lastSpaceIndex !== -1) {
      speechChunks.push(text.substring(0, lastSpaceIndex))
      text = text.substring(lastSpaceIndex + 1)
    } else {
      // If there are no spaces in the chunk, split at the maxLength
      speechChunks.push(text.substring(0, maxLength))
      text = text.substring(maxLength)
    }
  }

  return speechChunks
}

const speakText = async (text) => {
  const speechChunks = makeCunksOfText(text)

  for (let i = 0; i < speechChunks.length; i++) {
    await new Promise((resolve, reject) => {
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(speechChunks[i])
      utterance.pitch = TTS.pitch
      utterance.rate = TTS.rate
      utterance.volume = TTS.volume
      utterance.voice = window.speechSynthesis
        .getVoices()
        .find((voice) => voice.name === TTS.voice)

      window.speechSynthesis.speak(utterance)

      utterance.onend = () => {
        resolve()
      }
      utterance.onerror = (error) => {
        resolve()
      }
    })
  }
}

export default {
  name: 'app',
  setup: () => ({
    code: useLocalStorage('conpilot-code', '')
  }),
  data: () => ({
    is_processing: false,

    startProcessDebounced: () => {}
  }),
  watch: {
    code(new_code) {
      if (this.is_processing !== true) {
        this.startProcessDebounced(new_code)
      }
    }
  },
  methods: {
    async startProcess(new_code) {
      this.is_processing = true

      try {
        console.log('--- startProcess: init prediction')

        const { data, error } = await $fetch('/api/prediction', {
          method: 'POST',
          body: {
            code: new_code
          }
        })

        if (error) {
          throw new Error(error)
        }

        const url_stream = data?.url_stream

        if (!url_stream) {
          throw new Error('Failed to create prediction.')
        }

        this.doProcess(url_stream)
      } catch (e) {
        console.log('--- startProcess error: ', e)
        this.is_processing = false
      }
    },
    doProcess(url_stream) {
      let output = ''
      const source = new EventSource(url_stream)

      const removeEventListeners = () => {
        source.removeEventListener('output', handleOutput)
        source.removeEventListener('done', handleDone)
        source.removeEventListener('error', handleError)
      }

      const handleOutput = (e) => {
        output += e.data
      }

      const handleDone = (e) => {
        console.log('--- doProcess output done: ', output)
        source.close()
        removeEventListeners()

        this.tts(output)
      }

      const handleError = (e) => {
        console.log('--- doProcess error: ', e)
        source.close()
        removeEventListeners()

        this.is_processing = false
      }

      source.addEventListener('output', handleOutput)
      source.addEventListener('done', handleDone)
      source.addEventListener('error', handleError)
    },
    async tts(output) {
      try {
        await speakText(output)
      } catch (e) {
        console.log('--- tts error: ', e)
      } finally {
        this.is_processing = false
      }
    }
  },
  mounted() {
    // Sometimes it gets stuck
    window.speechSynthesis.cancel()

    // Init debounce function
    this.startProcessDebounced = useDebounceFn(this.startProcess, 1500)
  }
}
</script>

<style lang="stylus" scoped>
div
  .window
    display flex
    flex-direction column
    aspect-ratio 3/2

    .window-top-bar
      padding 11px 10px
      background #181818
      border 1px solid #464646
      border-bottom 1px solid #2b2b2b
      border-radius 10px 10px 0 0
      position relative

      .window-top-bar-buttons
        display flex
        column-gap 8px

        & > div
          width 12px
          height 12px
          border-radius 24px

        .red
          background #ec6a5e
        .yellow
          background #f5bf4f
        .green
          background #61c554

      .window-top-bar-title
        display flex
        align-items center
        justify-content center
        position absolute
        top 0
        left 0
        right 0
        bottom 0
        font-size 13px
        font-weight bold
        color #d4d4d4

    .window-content
      flex-grow 1
      background #1f1f1f
      border 1px solid #464646
      border-top 0
      border-radius 0 0 10px 10px
      overflow hidden

      .window-content-editor
        width 100%
        height 100%
</style>
