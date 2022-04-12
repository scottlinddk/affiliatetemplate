<template>
  <div>
    <h1>Guides</h1>
    <ul class="grid grid-cols-4 gap-4">
      <GuideView v-for="(guide, index) in guides" :key="index" :guide="guide" />
      {{
        ip
      }}
    </ul>
  </div>
</template>

<script>
export default {
  name: 'guides',
  data() {
    return {
      ip: null,
    }
  },
  async asyncData({ $content, params }) {
    const guides = await $content('guides', params.slug)
      // .only(['title', 'description', 'image', 'slug'])
      .fetch()
    return { guides }
  },
}
</script>
<style>
</style>

