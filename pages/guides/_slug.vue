<template>
  <nuxt-content :document="guide" />
</template>

<script>
export default {
  name: 'dynamic-guides',
  async asyncData({ $content, params }) {
    const guide = await $content('guides', params.slug).fetch()
    return { guide }
  },
  head() {
    return {
      title: this.guide.title,
      meta: [
        {
          hid: 'description',
          name: 'description',
          content: this.guide.description,
        },
        // Open Graph
        { hid: 'og:title', property: 'og:title', content: this.guide.title },
        {
          hid: 'og:description',
          property: 'og:description',
          content: this.guide.description,
        },
        // Twitter Card
        {
          hid: 'twitter:title',
          name: 'twitter:title',
          content: this.guide.title,
        },
        {
          hid: 'twitter:description',
          name: 'twitter:description',
          content: this.guide.description,
        },
      ],
    }
  },
}
</script>
