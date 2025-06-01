<template>
    <div class="flex flex-col">
        <div class="toast toast-top toast-end z-10">
            <div class="alert alert-error" v-if="err">
                <IconError class="stroke-current shrink-0 h-6 w-6" />
                <div>{{ err }}</div>
            </div>
        </div>
        <div v-if="!accountData?.Admin" class="alert alert-error">
            You don't have access to this page
        </div>
        <div v-if="accountData?.Admin" class="flex flex-col gap-4 p-6">
            <table class="table" v-if="datas && datas !== null">
                <tbody>
                    <!-- <tr v-for="(value, key) in datas">
                        <td>
                            {{ key }}
                        </td>
                        <td>
                            <input :value="value"
                                @input="e => (datas as any)[key] = (e.target as HTMLInputElement).value" type="text"
                                class="input text-base-content"
                                :disabled="['ID', 'CreatedAt', 'UpdatedAt', 'DeletedAt'].includes(key)">
                        </td>
                    </tr> -->
                    <tr>
                        <td colspan="2">
                            <div class="w-full flex items-center">
                                <h2 class="text-2xl font-bold">
                                    General Settings
                                </h2>
                                <button @click="load()" :disabled="isLoading" class="btn btn-neutral ml-auto">
                                    Reload
                                </button>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <p><strong>App Name</strong></p>
                            <p>The name of your app that will be displayed in the top left corner</p>
                        </td>
                        <td>
                            <input :value="datas.AppName"
                                @change="e => datas!.AppName = (e.target as HTMLInputElement).value" type="text"
                                class="input text-base-content" min="1" max="120" required>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <p><strong>BaseUrl</strong></p>
                            <p>Enter the base url of the API server</p>
                        </td>
                        <td>
                            <input :value="datas.BaseUrl"
                                @change="e => datas!.BaseUrl = (e.target as HTMLInputElement).value" type="url"
                                class="input text-base-content" min="1" max="255" required>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <p><strong>Project</strong></p>
                            <p>
                                Because the project is lisenced under GNU AFFERO GENERAL PUBLIC LICENSE Version 3, 19
                                November 2007 <br>
                                there must be a project name and a link to the project documentation.
                            </p>
                        </td>
                        <td>
                            <input :value="datas.Project"
                                @change="e => datas!.Project = (e.target as HTMLInputElement).value" type="text"
                                class="input text-base-content" min="1" max="120" required>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <p><strong>Project Documentation</strong></p>
                            <p>Enter the link to the project documentation</p>
                        </td>
                        <td>
                            <input :value="datas.ProjectDocumentation"
                                @change="e => datas!.ProjectDocumentation = (e.target as HTMLInputElement).value"
                                type="url" class="input text-base-content" min="1" max="512" required>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <p><strong>Project Download</strong></p>
                            <p>Enter the link to the project download</p>
                        </td>
                        <td>
                            <input :value="datas.ProjectDownload"
                                @change="e => datas!.ProjectDownload = (e.target as HTMLInputElement).value" type="url"
                                class="input text-base-content" min="1" max="512" required>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <p><strong>ProjectExampleVideo</strong></p>
                            <p>Enter the id of the example video</p>
                            <p>This video will be shown on the home page</p>
                        </td>
                        <td>
                            <input :value="datas.ProjectExampleVideo"
                                @change="e => datas!.ProjectExampleVideo = (e.target as HTMLInputElement).value"
                                type="url" class="input text-base-content" min="1" max="512" required>
                        </td>
                    </tr>
                    <tr>
                        <td colspan="2">
                            <h2 class="text-2xl font-bold">Security Settings</h2>
                        </td>
                    </tr>
                    <!-- JwtSecretKey -->
                    <tr>
                        <td>
                            <p><strong>JWT Secret Key</strong></p>
                            <p>Enter the JWT Secret Key</p>
                            <p>Focus the field to show the secret key</p>
                        </td>
                        <td>
                            <input :value="datas!.JwtSecretKey"
                                @change="e => datas!.JwtSecretKey = (e.target as HTMLInputElement).value" type="text"
                                class="input text-base-content blur focus:blur-none" min="8" max="512" required>
                        </td>
                    </tr>
                    <!-- JwtUploadSecretKey -->
                    <tr>
                        <td>
                            <p><strong>JWT Upload Secret Key</strong></p>
                            <p>Enter the JWT Upload Secret Key</p>
                            <p>Focus the field to show the secret key</p>
                        </td>
                        <td>
                            <input :value="datas!.JwtUploadSecretKey"
                                @change="e => datas!.JwtUploadSecretKey = (e.target as HTMLInputElement).value"
                                type="text" class="input text-base-content blur focus:blur-none" min="8" max="512"
                                required>
                        </td>
                    </tr>
                    <!-- CorsAllowOrigins -->
                    <tr>
                        <td>
                            <p><strong>Cors Allow Origins</strong></p>
                            <p>Enter the allowed origins</p>
                            <p>Only one origin can be entered</p>
                        </td>
                        <td>
                            <input :value="datas!.CorsAllowOrigins"
                                @change="e => datas!.CorsAllowOrigins = (e.target as HTMLInputElement).value"
                                type="text" class="input text-base-content" min="1" max="1000" required>
                        </td>
                    </tr>
                    <tr>
                        <td colspan="2">
                            <h2 class="text-2xl font-bold">Functionality Settings</h2>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <p><strong>Encoding</strong></p>
                            <p>Enable or disable encoding</p>
                        </td>
                        <td>
                            <input :checked="datas!.EncodingEnabled === 'true'"
                                @change="e => datas!.EncodingEnabled = (e.target as HTMLInputElement).checked ? 'true' : 'false'"
                                type="checkbox" class="toggle" required>
                            {{ datas!.EncodingEnabled === 'true' ? 'Enabled' : 'Disabled' }}
                        </td>
                    </tr>
                    <!-- UploadEnabled -->
                    <tr>
                        <td>
                            <p><strong>Upload</strong></p>
                            <p>Enable or disable upload</p>
                        </td>
                        <td>
                            <input :checked="datas!.UploadEnabled === 'true'"
                                @change="e => datas!.UploadEnabled = (e.target as HTMLInputElement).checked ? 'true' : 'false'"
                                type="checkbox" class="toggle" required>
                            {{ datas!.UploadEnabled === 'true' ? 'Enabled' : 'Disabled' }}
                        </td>
                    </tr>
                    <!-- DownloadEnabled -->
                    <tr>
                        <td>
                            <p><strong>Download</strong></p>
                            <p>Enable or disable download</p>
                        </td>
                        <td>
                            <input :checked="datas!.DownloadEnabled === 'true'"
                                @change="e => datas!.DownloadEnabled = (e.target as HTMLInputElement).checked ? 'true' : 'false'"
                                type="checkbox" class="toggle" required>
                            {{ datas!.DownloadEnabled === 'true' ? 'Enabled' : 'Disabled' }}
                        </td>
                    </tr>
                    <!-- RatelimitEnabled -->
                    <tr>
                        <td>
                            <p><strong>Ratelimit</strong></p>
                            <p>Enable or disable ratelimit</p>
                        </td>
                        <td>
                            <input :checked="datas!.RatelimitEnabled === 'true'"
                                @change="e => datas!.RatelimitEnabled = (e.target as HTMLInputElement).checked ? 'true' : 'false'"
                                type="checkbox" class="toggle" required>
                            {{ datas!.RatelimitEnabled === 'true' ? 'Enabled' : 'Disabled' }}
                        </td>
                    </tr>
                    <!-- CloudflareEnabled -->
                    <tr>
                        <td>
                            <p><strong>Cloudflare</strong></p>
                            <p>Enable this switch if your server is behind Cloudflare</p>
                            <p>This feature ensures that the server gets the correct forwarded IP address from
                                Cloudflare</p>
                        </td>
                        <td>
                            <input :checked="datas!.CloudflareEnabled === 'true'"
                                @change="e => datas!.CloudflareEnabled = (e.target as HTMLInputElement).checked ? 'true' : 'false'"
                                type="checkbox" class="toggle" required>
                            {{ datas!.CloudflareEnabled === 'true' ? 'Enabled' : 'Disabled' }}
                        </td>
                    </tr>
                    <tr>
                        <td colspan="2">
                            <h2 class="text-2xl font-bold">Quality Settings</h2>
                        </td>
                    </tr>
                    <!-- EncodeHls240p -->
                    <tr>
                        <td>
                            <p><strong>Encode HLS 240p</strong></p>
                            <p>Enable or disable encode HLS 240p</p>
                        </td>
                        <td>
                            <input :checked="datas!.EncodeHls240p === 'true'"
                                @change="e => datas!.EncodeHls240p = (e.target as HTMLInputElement).checked ? 'true' : 'false'"
                                type="checkbox" class="toggle" required>
                            {{ datas!.EncodeHls240p === 'true' ? 'Enabled' : 'Disabled' }}
                        </td>
                    </tr>
                    <!-- Hls240pVideoBitrate -->
                    <tr>
                        <td>
                            <p><strong>HLS 240p Video Bitrate</strong></p>
                            <p>The video bitrate of the HLS 240p stream</p>
                        </td>
                        <td>
                            <input :value="datas!.Hls240pVideoBitrate"
                                @change="e => datas!.Hls240pVideoBitrate = (e.target as HTMLInputElement).value"
                                type="text" class="input text-base-content" min="1" max="7" required>
                        </td>
                    </tr>
                    <!-- EncodeHls360p -->
                    <tr>
                        <td>
                            <p><strong>Encode HLS 360p</strong></p>
                            <p>Enable or disable encode HLS 360p</p>
                        </td>
                        <td>
                            <input :checked="datas!.EncodeHls360p === 'true'"
                                @change="e => datas!.EncodeHls360p = (e.target as HTMLInputElement).checked ? 'true' : 'false'"
                                type="checkbox" class="toggle" required>
                            {{ datas!.EncodeHls360p === 'true' ? 'Enabled' : 'Disabled' }}
                        </td>
                    </tr>
                    <!-- Hls360pVideoBitrate -->
                    <tr>
                        <td>
                            <p><strong>HLS 360p Video Bitrate</strong></p>
                            <p>The video bitrate of the HLS 360p stream</p>
                        </td>
                        <td>
                            <input :value="datas!.Hls360pVideoBitrate"
                                @change="e => datas!.Hls360pVideoBitrate = (e.target as HTMLInputElement).value"
                                type="text" class="input text-base-content" min="1" max="7" required>
                        </td>
                    </tr>
                    <!-- EncodeHls480p -->
                    <tr>
                        <td>
                            <p><strong>Encode HLS 480p</strong></p>
                            <p>Enable or disable encode HLS 480p</p>
                        </td>
                        <td>
                            <input :checked="datas!.EncodeHls480p === 'true'"
                                @change="e => datas!.EncodeHls480p = (e.target as HTMLInputElement).checked ? 'true' : 'false'"
                                type="checkbox" class="toggle" required>
                            {{ datas!.EncodeHls480p === 'true' ? 'Enabled' : 'Disabled' }}
                        </td>
                    </tr>
                    <!-- Hls480pVideoBitrate -->
                    <tr>
                        <td>
                            <p><strong>HLS 480p Video Bitrate</strong></p>
                            <p>The video bitrate of the HLS 480p stream</p>
                        </td>
                        <td>
                            <input :value="datas!.Hls480pVideoBitrate"
                                @change="e => datas!.Hls480pVideoBitrate = (e.target as HTMLInputElement).value"
                                type="text" class="input text-base-content" min="1" max="7" required>
                        </td>
                    </tr>
                    <!-- EncodeHls720p -->
                    <tr>
                        <td>
                            <p><strong>Encode HLS 720p</strong></p>
                            <p>Enable or disable encode HLS 720p</p>
                        </td>
                        <td>
                            <input :checked="datas!.EncodeHls720p === 'true'"
                                @change="e => datas!.EncodeHls720p = (e.target as HTMLInputElement).checked ? 'true' : 'false'"
                                type="checkbox" class="toggle" required>
                            {{ datas!.EncodeHls720p === 'true' ? 'Enabled' : 'Disabled' }}
                        </td>
                    </tr>
                    <!-- Hls720pVideoBitrate -->
                    <tr>
                        <td>
                            <p><strong>HLS 720p Video Bitrate</strong></p>
                            <p>The video bitrate of the HLS 720p stream</p>
                        </td>
                        <td>
                            <input :value="datas!.Hls720pVideoBitrate"
                                @change="e => datas!.Hls720pVideoBitrate = (e.target as HTMLInputElement).value"
                                type="text" class="input text-base-content" min="1" max="7" required>
                        </td>
                    </tr>
                    <!-- EncodeHls1080p -->
                    <tr>
                        <td>
                            <p><strong>Encode HLS 1080p</strong></p>
                            <p>Enable or disable encode HLS 1080p</p>
                        </td>
                        <td>
                            <input :checked="datas!.EncodeHls1080p === 'true'"
                                @change="e => datas!.EncodeHls1080p = (e.target as HTMLInputElement).checked ? 'true' : 'false'"
                                type="checkbox" class="toggle" required>
                            {{ datas!.EncodeHls1080p === 'true' ? 'Enabled' : 'Disabled' }}
                        </td>
                    </tr>
                    <!-- Hls1080pVideoBitrate -->
                    <tr>
                        <td>
                            <p><strong>HLS 1080p Video Bitrate</strong></p>
                            <p>The video bitrate of the HLS 1080p stream</p>
                        </td>
                        <td>
                            <input :value="datas!.Hls1080pVideoBitrate"
                                @change="e => datas!.Hls1080pVideoBitrate = (e.target as HTMLInputElement).value"
                                type="text" class="input text-base-content" min="1" max="7" required>
                        </td>
                    </tr>
                    <!-- EncodeHls1440p -->
                    <tr>
                        <td>
                            <p><strong>Encode HLS 1440p</strong></p>
                            <p>Enable or disable encode HLS 1440p</p>
                        </td>
                        <td>
                            <input :checked="datas!.EncodeHls1440p === 'true'"
                                @change="e => datas!.EncodeHls1440p = (e.target as HTMLInputElement).checked ? 'true' : 'false'"
                                type="checkbox" class="toggle" required>
                            {{ datas!.EncodeHls1440p === 'true' ? 'Enabled' : 'Disabled' }}
                        </td>
                    </tr>
                    <!-- Hls1440pVideoBitrate -->
                    <tr>
                        <td>
                            <p><strong>HLS 1440p Video Bitrate</strong></p>
                            <p>The video bitrate of the HLS 1440p stream</p>
                        </td>
                        <td>
                            <input :value="datas!.Hls1440pVideoBitrate"
                                @change="e => datas!.Hls1440pVideoBitrate = (e.target as HTMLInputElement).value"
                                type="text" class="input text-base-content" min="1" max="7" required>
                        </td>
                    </tr>
                    <!-- EncodeHls2160p -->
                    <tr>
                        <td>
                            <p><strong>Encode HLS 2160p</strong></p>
                            <p>Enable or disable encode HLS 2160p</p>
                        </td>
                        <td>
                            <input :checked="datas!.EncodeHls2160p === 'true'"
                                @change="e => datas!.EncodeHls2160p = (e.target as HTMLInputElement).checked ? 'true' : 'false'"
                                type="checkbox" class="toggle" required>
                            {{ datas!.EncodeHls2160p === 'true' ? 'Enabled' : 'Disabled' }}
                        </td>
                    </tr>
                    <!-- Hls2160pVideoBitrate -->
                    <tr>
                        <td>
                            <p><strong>HLS 2160p Video Bitrate</strong></p>
                            <p>The video bitrate of the HLS 2160p stream</p>
                        </td>
                        <td>
                            <input :value="datas!.Hls2160pVideoBitrate"
                                @change="e => datas!.Hls2160pVideoBitrate = (e.target as HTMLInputElement).value"
                                type="text" class="input text-base-content" min="1" max="7" required>
                        </td>
                    </tr>
                    <tr>
                        <td colspan="2">
                            <h2 class="text-2xl font-bold">Performance Settings</h2>
                        </td>
                    </tr>
                    <!-- MaxItemsMultiDelete -->
                    <tr>
                        <td>
                            <p><strong>Max Items Multi Delete</strong></p>
                            <p>Enter the maximum number of items that can be deleted at once</p>
                        </td>
                        <td>
                            <input :value="datas!.MaxItemsMultiDelete"
                                @change="e => datas!.MaxItemsMultiDelete = (e.target as HTMLInputElement).value"
                                type="number" class="input text-base-content" min="1" max="10000" required>
                        </td>
                    </tr>
                    <!-- MaxRunningEncodes -->
                    <tr>
                        <td>
                            <p><strong>Max Running Encodes</strong></p>
                            <p>Enter the maximum number of running encodes at the same time</p>
                        </td>
                        <td>
                            <input :value="datas!.MaxRunningEncodes"
                                @change="e => datas!.MaxRunningEncodes = (e.target as HTMLInputElement).value"
                                type="number" class="input text-base-content" min="1" max="10" required>
                        </td>
                    </tr>
                    <!-- MaxUploadFilesize -->
                    <tr>
                        <td>
                            <p><strong>Max Upload Filesize (Bytes)</strong></p>
                            <p>Enter the maximum upload filesize</p>
                        </td>
                        <td>
                            <input :value="datas!.MaxUploadFilesize"
                                @change="e => datas!.MaxUploadFilesize = (e.target as HTMLInputElement).value"
                                type="number" class="input text-base-content" min="1" required>
                        </td>
                    </tr>
                    <!-- MaxUploadChuncksize -->
                    <tr>
                        <td>
                            <p><strong>Max Upload Chunksize (Bytes)</strong></p>
                            <p>Enter the maximum upload chunksize</p>
                            <p>This is the size of the chunks that are uploaded to the server</p>
                            <p>If your server is behind a proxy like Cloudflare, you should set this to the size of the
                                proxies max upload size</p>
                        </td>
                        <td>
                            <input :value="datas!.MaxUploadChuncksize"
                                @change="e => datas!.MaxUploadChuncksize = (e.target as HTMLInputElement).value"
                                type="number" class="input text-base-content" min="1" required>
                        </td>
                    </tr>
                    <!-- MaxUploadSessions -->
                    <tr>
                        <td>
                            <p><strong>Max Upload Sessions</strong></p>
                            <p>Enter the maximum number of upload sessions</p>
                        </td>
                        <td>
                            <input :value="datas!.MaxUploadSessions"
                                @change="e => datas!.MaxUploadSessions = (e.target as HTMLInputElement).value"
                                type="number" class="input text-base-content" min="1" max="100" required>
                        </td>
                    </tr>
                    <!-- MaxPostSize -->
                    <tr>
                        <td>
                            <p><strong>Max Post Size (Bytes)</strong></p>
                            <p>Enter the maximum post size</p>
                            <p>This value should be higher than the maximum upload chunksize</p>
                        </td>
                        <td>
                            <input :value="datas!.MaxPostSize"
                                @change="e => datas!.MaxPostSize = (e.target as HTMLInputElement).value" type="number"
                                class="input text-base-content" min="1" required>
                        </td>
                    </tr>
                    <tr>
                        <td colspan="2">
                            <h2 class="text-2xl font-bold">Captcha Settings</h2>
                        </td>
                    </tr>
                    <!-- CaptchaEnabled -->
                    <tr>
                        <td>
                            <p><strong>Captcha Enabled</strong></p>
                            <p>Enable or disable captcha</p>
                            <p>Currently only implemented on the login page</p>
                        </td>
                        <td>
                            <input :checked="datas!.CaptchaEnabled === 'true'"
                                @change="e => datas!.CaptchaEnabled = (e.target as HTMLInputElement).checked ? 'true' : 'false'"
                                type="checkbox" class="toggle" required>
                            {{ datas!.CaptchaEnabled === 'true' ? 'Enabled' : 'Disabled' }}
                        </td>
                    </tr>
                    <!-- CaptchaType -->
                    <tr>
                        <td>
                            <p><strong>Captcha Type</strong></p>
                            <p>Select the captcha type</p>
                        </td>
                        <td>
                            <select :value="datas!.CaptchaType"
                                @change="e => datas!.CaptchaType = (e.target as HTMLInputElement).value" class="select">
                                <option value="">None</option>
                                <option value="recaptcha">ReCaptcha</option>
                                <option value="hcaptcha">hCaptcha</option>
                            </select>
                        </td>
                    </tr>
                    <!-- Captcha_Recaptcha_PrivateKey -->
                    <tr v-if="datas!.CaptchaType === 'recaptcha'">
                        <td>
                            <p><strong>ReCaptcha Private Key</strong></p>
                            <p>Enter the ReCaptcha private key</p>
                        </td>
                        <td>
                            <input :value="datas!.Captcha_Recaptcha_PrivateKey"
                                @change="e => datas!.Captcha_Recaptcha_PrivateKey = (e.target as HTMLInputElement).value"
                                type="text" class="input text-base-content blur focus:blur-none" min="1" max="40"
                                required>
                        </td>
                    </tr>
                    <!-- Captcha_Recaptcha_PublicKey -->
                    <tr v-if="datas!.CaptchaType === 'recaptcha'">
                        <td>
                            <p><strong>ReCaptcha Public Key</strong></p>
                            <p>Enter the ReCaptcha public key</p>
                        </td>
                        <td>
                            <input :value="datas!.Captcha_Recaptcha_PublicKey"
                                @change="e => datas!.Captcha_Recaptcha_PublicKey = (e.target as HTMLInputElement).value"
                                type="text" class="input text-base-content" min="1" max="40" required>
                        </td>
                    </tr>
                    <!-- Captcha_Hcaptcha_PrivateKey -->
                    <tr v-if="datas!.CaptchaType === 'hcaptcha'">
                        <td>
                            <p><strong>hCaptcha Private Key</strong></p>
                            <p>Enter the hCaptcha private key</p>
                        </td>
                        <td>
                            <input :value="datas!.Captcha_Hcaptcha_PrivateKey"
                                @change="e => datas!.Captcha_Hcaptcha_PrivateKey = (e.target as HTMLInputElement).value"
                                type="text" class="input text-base-content blur focus:blur-none" min="1" max="42"
                                required>
                        </td>
                    </tr>
                    <!-- Captcha_Hcaptcha_PublicKey -->
                    <tr v-if="datas!.CaptchaType === 'hcaptcha'">
                        <td>
                            <p><strong>hCaptcha Public Key</strong></p>
                            <p>Enter the hCaptcha public key</p>
                        </td>
                        <td>
                            <input :value="datas!.Captcha_Hcaptcha_PublicKey"
                                @change="e => datas!.Captcha_Hcaptcha_PublicKey = (e.target as HTMLInputElement).value"
                                type="text" class="input text-base-content" min="1" max="120" required>
                        </td>
                    </tr>
                    <tr>
                        <td colspan="2">
                            <h2 class="text-2xl font-bold">Plugin Settings</h2>
                        </td>
                    </tr>
                    <!-- PluginPgsServer -->
                    <tr>
                        <td>
                            <p><strong>Plugin PGS Server</strong></p>
                            <p>Enter the PGS server</p>
                            <p>This is the server that is used to convert PGS subtitles into a somewhat readable format.
                            </p>
                        </td>
                        <td>
                            <input :value="datas!.PluginPgsServer"
                                @change="e => datas!.PluginPgsServer = (e.target as HTMLInputElement).value" type="url"
                                class="input text-base-content" min="1" max="512" required>
                        </td>
                    </tr>
                    <!-- EnablePluginPgsServer -->
                    <tr>
                        <td>
                            <p><strong>Enable Plugin PGS Server</strong></p>
                            <p>Enable or disable the PGS server</p>
                        </td>
                        <td>
                            <input :checked="datas!.EnablePluginPgsServer === 'true'"
                                @change="e => datas!.EnablePluginPgsServer = (e.target as HTMLInputElement).checked ? 'true' : 'false'"
                                type="checkbox" class="toggle" required>
                            {{ datas!.EnablePluginPgsServer === 'true' ? 'Enabled' : 'Disabled' }}
                        </td>
                    </tr>



                    <!-- SAVE BUTTON -->
                    <tr>
                        <td colspan="2">
                            <button @click="update()" :disabled="isLoading" class="btn btn-primary">
                                <span v-if="isLoading" class=" loading loading-spinner"></span>
                                <span v-else>Save</span>
                            </button>
                        </td>
                    </tr>
                    <tr>
                        <td colspan="2">
                            <p class="alert alert-warning font-bold">
                                Some settings require a restart of the server to take effect.
                            </p>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script lang="ts" setup>
definePageMeta({
    layout: "panel",
    middleware: "auth",
});

const { data: accountData } = useAccountData()
watch(accountData, () => {
    if (accountData.value) {
        if (!accountData.value.Admin) {
            navigateTo("/my", {
                redirectCode: 307,
            })
        }
    }
})

const conf = useRuntimeConfig();
const token = useToken();
const err = ref("");
const isLoading = ref(false)

const datas = ref<ConfigResponse | null>(null)

useAsyncData('config', async () => {
    return await load()
})

async function load() {
    try {
        isLoading.value = true;
        const data = await $fetch<ConfigResponse>(`${conf.public.apiUrl}/settings`, {
            headers: {
                Authorization: `Bearer ${token.value}`,
            },
        });
        if (data) {
            datas.value = data
        }
    } catch (error: any) {
        err.value = `${error?.data}`;
    } finally {
        setTimeout(() => {
            isLoading.value = false;
        }, 300);
    }
}

async function update() {
    try {
        isLoading.value = true;
        const data = await $fetch<ConfigResponse>(`${conf.public.apiUrl}/settings`, {
            method: "put",
            headers: {
                Authorization: `Bearer ${token.value}`,
            },
            body: datas.value,
        });
        if (data) {
            datas.value = data
            load();
        }
    } catch (error: any) {
        err.value = `${error?.data}`;
    } finally {
        setTimeout(() => {
            isLoading.value = false;
        }, 300);
    }
}

export interface ConfigResponse {
    ID: number
    CreatedAt: string
    UpdatedAt: string
    DeletedAt: any

    AppName: string
    BaseUrl: string
    Project: string
    ProjectDocumentation: string
    ProjectDownload: string
    ProjectExampleVideo: string

    JwtSecretKey: string
    JwtUploadSecretKey: string
    CorsAllowOrigins: string
    // CorsAllowHeaders: string
    // CorsAllowCredentials: string

    ReloadHtml: string
    EncodingEnabled: string
    UploadEnabled: string
    DownloadEnabled: string
    RatelimitEnabled: string
    CloudflareEnabled: string

    MaxItemsMultiDelete: string
    MaxRunningEncodes: string
    MaxUploadFilesize: string
    MaxUploadChuncksize: string
    MaxUploadSessions: string
    MaxPostSize: string



    CaptchaEnabled: string
    CaptchaType: string
    Captcha_Recaptcha_PrivateKey: string
    Captcha_Recaptcha_PublicKey: string
    Captcha_Hcaptcha_PrivateKey: string
    Captcha_Hcaptcha_PublicKey: string

    EncodeHls240p: string
    Hls240pVideoBitrate: string
    EncodeHls360p: string
    Hls360pVideoBitrate: string
    EncodeHls480p: string
    Hls480pVideoBitrate: string
    EncodeHls720p: string
    Hls720pVideoBitrate: string
    EncodeHls1080p: string
    Hls1080pVideoBitrate: string
    EncodeHls1440p: string
    Hls1440pVideoBitrate: string
    EncodeHls2160p: string
    Hls2160pVideoBitrate: string

    PluginPgsServer: string
    EnablePluginPgsServer: string
}

</script>
