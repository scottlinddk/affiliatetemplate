<template>
  <!-- <li>
    <div class="image">
      <a :href="`/guides/` + guide.slug">
        <img :src="guide.heroImage" :alt="guide.heroImageAlt" class="" />
      </a>
    </div>
    <h2 class="mt-30 font-semibold text-2xl">
      {{ guide.title }}
    </h2>
    <p class="text-2xl">
      {{ guide.shortDescription }}
    </p>
    <NuxtLink class="text-2xl" :to="`/guides/` + guide.slug">
      Læs guide
    </NuxtLink>
  </li> -->
  <li
    class="
      max-w-sm
      bg-white
      rounded-lg
      border border-gray-200
      shadow-md
      dark:bg-gray-800 dark:border-gray-700
    "
  >
    <NuxtLink :to="`/guides/` + guide.slug">
      <img
        class="rounded-t-lg"
        :src="guide.heroImage"
        :alt="guide.heroImageAlt"
      />
    </NuxtLink>
    <div class="p-5">
      <NuxtLink :to="`/guides/` + guide.slug">
        <h5
          class="
            mb-2
            text-2xl
            font-bold
            tracking-tight
            text-gray-900
            dark:text-white
          "
        >
          {{ guide.title }}
        </h5>
      </NuxtLink>
      <p class="mb-3 font-normal text-gray-700 dark:text-gray-400">
        {{ guide.shortDescription }}
      </p>
      <NuxtLink
        :to="`/guides/` + guide.slug"
        class="
          inline-flex
          items-center
          py-2
          px-3
          text-sm
          font-medium
          text-center text-white
          bg-blue-700
          rounded-lg
          hover:bg-blue-800
          focus:ring-4 focus:outline-none focus:ring-blue-300
          dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800
        "
      >
        Læs guide
        <svg
          class="ml-2 -mr-1 w-4 h-4"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill-rule="evenodd"
            d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
            clip-rule="evenodd"
          ></path>
        </svg>
      </NuxtLink>
    </div>
  </li>
</template>

<script>
export default {
  name: 'guide-view',
  props: ['guide'],
}
</script>

<style scoped>
nav {
  position: fixed;
}
</style>
