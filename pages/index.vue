<template>
  <div>
    <div>
      <ul>
        <ProdView
          v-for="(produkt, index) in feed.produkter.produkt"
          :key="index"
          :produkt="produkt"
        />
      </ul>
    </div>
  </div>
</template>

<script>
export default {
  layout: 'default',
  data() {
    return {
      feed: [],
      feedURL: 'https://partneradsproductfeed.herokuapp.com/api/feed/7335',
    }
  },
  async fetch() {
    this.feed = await fetch(this.feedURL).then((res) => res.json())
  },
  mounted() {},
}
</script>
