<template>
  <div>
    <div>
      <ul>
        <ProdView
          v-for="(produkt, index) in produkter.produkter.produkt"
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
     produkter: []
    }
  },
  async fetch() {
    this.produkter = await fetch("https://partneradsproductfeed.herokuapp.com/api/feed/7435").then((res) => res.json())
  },
  mounted() {},
}
</script>
