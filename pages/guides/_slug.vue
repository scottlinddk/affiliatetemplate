<template>
  <div>
    {{ guides }}
  </div>
</template>

<script>
export default {
  name: 'dynamic-guides',
  async asyncData({ $content, params }) {
    const guides = await $content('guides', params.slug).fetch()
    return { guides }
  },
  head() {
    return {
      title: this.guides.title,
      meta: [
        {
          hid: 'description',
          name: 'description',
          content: this.guides.description,
        },
        // Open Graph
        { hid: 'og:title', property: 'og:title', content: this.guides.title },
        {
          hid: 'og:description',
          property: 'og:description',
          content: this.guides.description,
        },
        // Twitter Card
        {
          hid: 'twitter:title',
          name: 'twitter:title',
          content: this.guides.title,
        },
        {
          hid: 'twitter:description',
          name: 'twitter:description',
          content: this.guides.description,
        },
      ],
    }
  },
}
</script>
