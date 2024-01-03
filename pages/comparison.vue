<template>
    <div v-if="conf.public.currentEdition === 'cloud'" class="flex flex-col w-full max-w-[1700px]">
        <div class="hero w-full py-6 max-w-full bg-base-300">
            <div class="hero-content max-w-full overflow-hidden flex flex-col py-6">
                <h1 class="text-6xl font-bold">Comparison</h1>
                <div class="overflow-x-auto max-w-full">
                    <table class="table table-zebra">
                        <!-- head -->
                        <thead>
                            <tr>
                                <th></th>
                                <th>
                                    <h2 class="text-xl font-bold">
                                        {{ conf.public.name }} CE
                                    </h2>
                                </th>
                                <th>
                                    <h2 class="text-xl font-bold">
                                        {{ conf.public.name }} BE
                                    </h2>
                                </th>
                                <th>
                                    <h2 class="text-xl font-bold">
                                        {{ conf.public.name }} Cloud
                                    </h2>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <th>Edition</th>
                                <td>Community Edition</td>
                                <td>Business Edition</td>
                                <td>Cloud Edition</td>
                            </tr>

                            <tr>
                                <th>Pricing</th>
                                <td>Free for ever</td>
                                <td>Request Quote</td>
                                <td>
                                    <nuxt-link class="link link-primary link-hover" to="/pricing">
                                        Pay-as-you-go
                                    </nuxt-link>
                                </td>
                            </tr>
                            <tr>
                                <th colspan="4" class="text-center">Hosting</th>
                            </tr>
                            <tr>
                                <th>Selfhost</th>
                                <td>
                                    <IconDone class="fill-success shrink-0 h-6 w-6" />
                                </td>
                                <td>
                                    <IconDone class="fill-success shrink-0 h-6 w-6" />
                                </td>
                                <td>
                                    <IconError class="stroke-error shrink-0 h-6 w-6" />
                                </td>
                            </tr>
                            <tr>
                                <th>Managed Hosting</th>
                                <td>
                                    <IconError class="stroke-error shrink-0 h-6 w-6" />
                                </td>
                                <td>
                                    <IconError class="stroke-error shrink-0 h-6 w-6" />
                                </td>
                                <td>
                                    <IconDone class="fill-success shrink-0 h-6 w-6" />
                                </td>
                            </tr>
                            <tr>
                                <th colspan="4" class="text-center">Support</th>
                            </tr>
                            <tr>
                                <th>Email Support</th>
                                <td>
                                    <IconError class="stroke-error shrink-0 h-6 w-6" />
                                </td>
                                <td>
                                    <IconDone class="fill-success shrink-0 h-6 w-6" />
                                </td>
                                <td>
                                    <IconDone class="fill-success shrink-0 h-6 w-6" />
                                </td>
                            </tr>
                            <tr>
                                <th>Additional Support</th>
                                <td>
                                    <IconError class="stroke-error shrink-0 h-6 w-6" />
                                </td>
                                <td>
                                    <IconDone class="fill-success shrink-0 h-6 w-6" />
                                </td>
                                <td>
                                    <IconError class="stroke-error shrink-0 h-6 w-6" />
                                </td>
                            </tr>
                            <tr>
                                <th>Community Support</th>
                                <td>
                                    <IconDone class="fill-success shrink-0 h-6 w-6" />
                                </td>
                                <td>
                                    <IconDone class="fill-success shrink-0 h-6 w-6" />
                                </td>
                                <td>
                                    <IconDone class="fill-success shrink-0 h-6 w-6" />
                                </td>
                            </tr>
                            <tr>
                                <th colspan="4" class="text-center">
                                    Limitations
                                </th>
                            </tr>
                            <tr>
                                <th>Architecture</th>
                                <td>Monolithic</td>
                                <td>Monolithic & Microservices</td>
                                <td>-</td>
                            </tr>
                            <tr>
                                <th>Max. Server count</th>
                                <td>1 Server</td>
                                <td>No Limit</td>
                                <td>-</td>
                            </tr>
                            <tr>
                                <th>Load Balancing Traffic</th>
                                <td>
                                    <IconError class="stroke-error shrink-0 h-6 w-6" />
                                </td>
                                <td>
                                    <IconDone class="fill-success shrink-0 h-6 w-6" />
                                </td>
                                <td>-</td>
                            </tr>
                            <tr>
                                <th>Storage Servers</th>
                                <td>
                                    <IconError class="stroke-error shrink-0 h-6 w-6" />
                                </td>
                                <td>
                                    <IconDone class="fill-success shrink-0 h-6 w-6" />
                                </td>
                                <td>-</td>
                            </tr>
                            <tr>
                                <th>Commercial use</th>
                                <td>
                                    <IconError class="stroke-error shrink-0 h-6 w-6" />
                                </td>
                                <td>
                                    <IconDone class="fill-success shrink-0 h-6 w-6" />
                                </td>
                                <td>
                                    <IconDone class="fill-success shrink-0 h-6 w-6" />
                                </td>
                            </tr>

                            <tr>
                                <th colspan="4" class="text-center">
                                    Features
                                </th>
                            </tr>
                            <tr>
                                <th>GPU Encoding</th>
                                <td>
                                    <IconError class="stroke-error shrink-0 h-6 w-6" />
                                </td>
                                <td>
                                    <IconDone class="fill-success shrink-0 h-6 w-6" />
                                </td>
                                <td>-</td>
                            </tr>
                            <tr>
                                <th>Multi Quality</th>
                                <td>
                                    <IconDone class="fill-success shrink-0 h-6 w-6" />
                                </td>
                                <td>
                                    <IconDone class="fill-success shrink-0 h-6 w-6" />
                                </td>
                                <td>
                                    <IconDone class="fill-success shrink-0 h-6 w-6" />
                                </td>
                            </tr>
                            <tr>
                                <th>Multi Audio</th>
                                <td>
                                    <IconDone class="fill-success shrink-0 h-6 w-6" />
                                </td>
                                <td>
                                    <IconDone class="fill-success shrink-0 h-6 w-6" />
                                </td>
                                <td>
                                    <IconDone class="fill-success shrink-0 h-6 w-6" />
                                </td>
                            </tr>
                            <tr>
                                <th>Multi Subtitle</th>
                                <td>
                                    <IconDone class="fill-success shrink-0 h-6 w-6" />
                                </td>
                                <td>
                                    <IconDone class="fill-success shrink-0 h-6 w-6" />
                                </td>
                                <td>
                                    <IconDone class="fill-success shrink-0 h-6 w-6" />
                                </td>
                            </tr>
                            <tr>
                                <th>Hardsub</th>
                                <td>
                                    <IconDone class="fill-success shrink-0 h-6 w-6" />
                                </td>
                                <td>
                                    <IconDone class="fill-success shrink-0 h-6 w-6" />
                                </td>
                                <td>
                                    <IconDone class="fill-success shrink-0 h-6 w-6" />
                                </td>
                            </tr>
                            <tr>
                                <th>Download</th>
                                <td>
                                    <IconDone class="fill-success shrink-0 h-6 w-6" />
                                </td>
                                <td>
                                    <IconDone class="fill-success shrink-0 h-6 w-6" />
                                </td>
                                <td>
                                    <IconDone class="fill-success shrink-0 h-6 w-6" />
                                </td>
                            </tr>

                            <tr>
                                <th>Custom Domain</th>
                                <td>
                                    <IconDone class="fill-success shrink-0 h-6 w-6" />
                                </td>
                                <td>
                                    <IconDone class="fill-success shrink-0 h-6 w-6" />
                                </td>
                                <td>
                                    <IconError class="stroke-error shrink-0 h-6 w-6" />
                                </td>
                            </tr>
                            <tr>
                                <th>User Registration</th>
                                <td>
                                    <IconError class="stroke-error shrink-0 h-6 w-6" />
                                </td>
                                <td>
                                    <IconDone class="fill-success shrink-0 h-6 w-6" />
                                </td>
                                <td>
                                    <IconDone class="fill-success shrink-0 h-6 w-6" />
                                </td>
                            </tr>
                            <tr>
                                <th colspan="4" class="text-center">
                                    Statistics
                                </th>
                            </tr>
                            <tr>
                                <th>View Statistics</th>
                                <td>
                                    <IconDone class="fill-success shrink-0 h-6 w-6" />
                                </td>
                                <td>
                                    <IconDone class="fill-success shrink-0 h-6 w-6" />
                                </td>
                                <td>
                                    <IconDone class="fill-success shrink-0 h-6 w-6" />
                                </td>
                            </tr>
                            <tr>
                                <th>Advanced Statistics</th>
                                <td>
                                    <IconError class="stroke-error shrink-0 h-6 w-6" />
                                </td>
                                <td>
                                    <IconDone class="fill-success shrink-0 h-6 w-6" />
                                </td>
                                <td>
                                    <IconError class="stroke-error shrink-0 h-6 w-6" />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
definePageMeta({
    layout: "default",
});

const conf = useRuntimeConfig();
const serverConf = useServerConfig();
</script>
