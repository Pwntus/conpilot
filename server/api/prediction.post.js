import Replicate from 'replicate'

const MODEL_NAME = 'meta/meta-llama-3-8b-instruct'

export default defineEventHandler(async (event) => {
  try {
    const { code } = await readBody(event)

    // Validate
    if (!code || code === '') throw new Error('Invalid input.')

    // Init Replicate
    const { replicateApiToken } = useRuntimeConfig(event)
    const replicate = new Replicate({ auth: replicateApiToken })

    console.log(`--- log (api/prediction): creating prediction`)

    // Create prediction
    const prediction = await replicate.predictions.create({
      model: MODEL_NAME,
      stream: true,
      input: {
        max_tokens: 128,
        min_tokens: -1,
        temperature: 0.75,
        top_p: 0.9,
        top_k: 0,
        stop_sequences: '<|end_of_text|>,<|eot_id|>',
        length_penalty: 1,
        presence_penalty: 0,
        // seed: 1337,
        system_prompt: `You are in a pair programming session and are criticizing the presented code. You think that the code is inferior to what you can write, so give snarky and passive agressive comments. You must follow these rules:
- Don't write any code!
- Don't write markdown!
- Just give comments on the code!
- Be short!
- Be funny!`,
        prompt: `${code}`,
        prompt_template: `<|begin_of_text|><|start_header_id|>system<|end_header_id|>

        {system_prompt}<|eot_id|><|start_header_id|>user<|end_header_id|>
        
        {prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>
`
      }
    })

    console.log(prediction)

    const stream = prediction?.urls?.stream

    if (!stream) {
      throw new Error('Failed to create prediciton.')
    }

    return { data: { url_stream: prediction.urls.stream } }
  } catch (e) {
    console.log('--- error (api/prediction): ', e)

    return {
      error: e.message
    }
  }
})
