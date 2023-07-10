<template>
    <div class="hero min-h-screen max-w-6xl bg-base-200">
        <div class="hero-content flex-col lg:flex-row py-6">
            <div
                class="max-w-xs md:max-w-md rounded-lg shadow-2xl bg-base-300 p-6"
            >
                <img src="@/assets/hero1.svg" />
            </div>
            <div class="max-w-md">
                <h1 class="text-5xl font-bold text-center">VideoCMS</h1>
                <p class="py-6 text-center">
                    Start distributing videos on
                    <span class="text-blue-400"> your own hardware</span> with
                    only
                    <span class="text-blue-400">one command</span>
                </p>
                <div class="flex justify-center">
                    <div class="mockup-code w-0 sm:w-full">
                        <code class="block px-6">
                            <p class="truncate">
                                <span class="text-blue-400">docker</span>
                                <span> run -p 3000:3000 \</span><br />
                                <span> {{ dockerTag }}</span>
                            </p>
                        </code>
                    </div>
                </div>
                <div class="flex justify-center mt-6">
                    <button
                        class="btn btn-primary"
                        onclick="select_hosting.showModal()"
                    >
                        Get Started
                    </button>
                </div>
                <dialog id="select_hosting" class="modal">
                    <form method="dialog" class="modal-box w-fill">
                        <button
                            class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
                        >
                            ✕
                        </button>
                        <h3 class="font-bold text-lg">Choose Hosting Method</h3>
                        <div
                            class="flex flex-col items-center md:justify-center md:flex-row gap-6 p-6 border-opacity-50"
                        >
                            <div class="card w-full">
                                <div
                                    class="card-body flex flex-col items-center bg-base-300 rounded"
                                >
                                    <img
                                        class="h-32"
                                        src="@/assets/docker.svg"
                                        alt="Docker Logo"
                                    />
                                    <a
                                        class="btn normal-case"
                                        target="_blank"
                                        :href="serverConf.Project"
                                    >
                                        Self Host
                                    </a>
                                </div>
                            </div>
                            <div class="divider md:divider-horizontal">OR</div>
                            <div class="card w-full">
                                <div
                                    class="card-body flex flex-col items-center bg-base-300 rounded"
                                >
                                    <img
                                        class="h-32"
                                        src="@/assets/logo.png"
                                        alt="Docker Logo"
                                    />
                                    <nuxtLink class="btn normal-case" to="/my">
                                        Try on {{ serverConf.AppName }}
                                    </nuxtLink>
                                </div>
                            </div>
                        </div>
                    </form>
                </dialog>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
const conf = useRuntimeConfig();
const serverConf = useServerConfig();
const dockerTag = conf.public.dockerHubTag;
</script>
