<template>
    <ul class="menu bg-base-200 w-56 rounded-box grow-0">
        <li>
            <ul>
                <li v-for="menuItem in menuItems">
                    <nuxtLink :class="route.fullPath == menuItem.href
                        ? linkclass.enabled
                        : linkclass.disabled
                        " :to="menuItem.href">{{ menuItem.text }}</nuxtLink>
                </li>
            </ul>
        </li>
    </ul>
</template>

<script lang="ts" setup>
const route = useRoute();

const menuItems = ref<Array<{
    text: string;
    href: string;
}>>([]);

const { data: accountData } = useAccountData()

onMounted(() => {
    renderMenu()
})

watch(accountData, () => {
    renderMenu()
})

function renderMenu() {
    menuItems.value = [
        {
            text: "Dashboard",
            href: "/my",
        },
        {
            text: "Videos",
            href: "/my/videos",
        },
        {
            text: "Statistics",
            href: "/my/stats",
        },
        {
            text: "Webhooks",
            href: "/my/webhooks",
        },
        {
            text: "Settings",
            href: "/my/settings",
        },
    ];
    if (accountData.value) {
        menuItems.value.push({
            text: "Servers",
            href: "/my/servers",
        })
    }
}


const linkclass = {
    enabled: "btn btn-sm btn-primary flex justify-start normal-case text-left",
    disabled: "btn btn-sm flex justify-start normal-case text-left",
};
</script>
