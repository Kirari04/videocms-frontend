import { v4 as uuidv4 } from "uuid";
import { ref } from "vue";
import { useToken } from "@/composables/states";
import { useRuntimeConfig } from "#imports";

export interface QueueItem {
    uuid: String;
    name: String;
    size: number;
    file: File;
    folderId: number;
    progress: number;
    uploading: boolean;
    log: QueueItemLog[];
    chuncks: QueueItemChunck[];
    session?: ApiPcuSession;
    serverFile?: ApiPcuFile;
    errored?: boolean;
    fin: boolean;
    paused: boolean;
    deleted?: boolean;
}

export interface QueueItemChunck {
    index: number;
    uploading: boolean;
    fin: boolean;
    errored?: boolean;
}

export interface QueueItemLog {
    level: "warn" | "error" | "info";
    title: String;
    description?: String;
}
interface ApiPcuSession {
    Token: String;
    UUID: String;
    ChunckCount: number;
    Expires: String;
}
interface ApiPcuFile {
    ID: number;
    CreatedAt: String;
    UpdatedAt: String;
    DeletedAt: null;
    UUID: String;
    Name: String;
    ParentFolderID: number;
}

const allowed_extensions = [
    "mp4",   // MPEG-4 Part 14, most common web format
	"mkv",   // Matroska Multimedia Container, high quality/multi-stream
	"webm",  // Royalty-free format for the web (VP8/VP9)
	"avi",   // Audio Video Interleave, legacy Windows format
	"mov",   // QuickTime File Format, Apple standard
	"ts",    // MPEG transport stream, common in broadcasting/streaming
	"m4v",   // Apple iTunes video format
	"3gp",   // Multimedia container for 3G mobile phones
	"3g2",   // Multimedia container for 3G2 mobile phones
	"wmv",   // Windows Media Video
	"mpg",   // MPEG-1/2 video format
	"mpeg",  // MPEG-1/2 video format
	"asf",   // Advanced Systems Format, Microsoft streaming format
	"flv",   // Flash Video
	"f4v",   // Flash Video (MPEG-4 based)
	"m2ts",  // Blu-ray Disc Audio-Video (BDAV) MPEG-2 Transport Stream
	"mts",   // AVCHD video format, common on camcorders
	"vob",   // DVD Video Object
	"mxf",   // Material Exchange Format, common in professional editing
	"divx",  // DivX video format
	"ogv",   // Ogg Video format
	"rm",    // RealMedia format
	"rmvb",  // RealMedia Variable Bitrate
	"dv",    // Digital Video format
];

const paused_state = ref<boolean>(false);
const upload_queue = ref<QueueItem[]>([]);
const is_uploading_state = ref<boolean>(false);
const progress_state = ref<number>(0);

const parallel_files = () => upload_queue.value.filter(e => e.uploading).length;
const parallel_chuncks = () => {
    let count = 0;
    const v = upload_queue.value.map(e => e.chuncks.filter(e => e.uploading).length)
    for (const countUploading of v) {
        count = count + countUploading
    }
    return count
};
const max_parallel_files = ref<number>(3);
export const max_parallel_chuncks = ref<number>(4);
export const max_retry_chuncks = ref<number>(2);

/**
 * This function returns the state of the upload queue.
 * You can use this for tracking the upload progress.
 * Dont modify the state externaly.
 */
export const getUploadQueue = () => upload_queue;

/**
 * This function is used when a user submits new files through a form or file input.
 * @param files
 */
export const addToUploadQueue = (files: FileList) => {
    const folderPathHistory = useState<
        Array<{
            name: string;
            folderId: number;
        }>
    >("folderPathHistory", () => ([]));

    for (const file of files) {
        const ext = file.name.split(".").pop() ?? "";
        const uuid = uuidv4();
        
        const lastHistory = folderPathHistory.value.length > 0 ? folderPathHistory.value[folderPathHistory.value.length - 1] : null;

        upload_queue.value.push({
            uuid,
            size: file.size,
            file: file,
            name: file.name,
            folderId: lastHistory?.folderId ?? 0,
            progress: 0,
            uploading: false,
            paused: false,
            fin: false,
            log: [],
            chuncks: [],
        });

        if (!allowed_extensions.includes(ext.toLowerCase())) {
            addLogToFile(
                uuid,
                {
                    level: "error",
                    title: "Not allowed file extension",
                    description: `The file extension "${ext}" is not allowed/supported`,
                },
                true
            );
        }
    }
    updateProgressState();
};

/**
 * This function starts uploading all files that are queued.
 */
export const startUploadQueue = () => {
    if (!is_uploading_state.value) {
        is_uploading_state.value = true;
        startUploadWorker();
    }
};
/**
 * This function stops the upload process.
 * You can resume the upload by calling startUploadQueue() again.
 */
export const stopUploadQueue = () => {
    if (is_uploading_state.value) {
        stopUploadWorker();
        is_uploading_state.value = false;
    }
};

/**
 * This function returns the state of the upload.
 * If it is currently uploading the state will be true else false
 */
export const isUploadingState = () => is_uploading_state;

/**
 * This function returns the upload progress of all files.
 * The returned number state is between 0 & 100
 */
export const getUploadProgress = () => progress_state;

/**
 * This function deletes a file that is currently inside the upload queue.
 * @param uuid
 */
export const removeUploadQueueItem = (uuid: String) => {
    const fileIndex = upload_queue.value.findIndex((e) => e.uuid === uuid);

    if (fileIndex >= 0 && !upload_queue.value[fileIndex].deleted) {
        upload_queue.value[fileIndex].deleted = true;
        const intv = setInterval(async () => {
            const currentIndex = upload_queue.value.findIndex((e) => e.uuid === uuid);
            if (currentIndex < 0) {
                clearInterval(intv);
                return;
            }

            if (upload_queue.value[currentIndex].chuncks.filter(e => e.uploading).length === 0) {
                // delete session
                const conf = useRuntimeConfig();
                const token = useToken();
                const sessionUUID = upload_queue.value[currentIndex].session?.UUID;
                
                if (sessionUUID) {
                    const { error } = await useFetch<string>(`${conf.public.apiUrl}/pcu/session`, {
                        method: "delete",
                        headers: {
                            Authorization: `Bearer ${token.value}`,
                        },
                        body: {
                            UploadSessionUUID: sessionUUID,
                        }
                    });
                    if (error.value) {
                        addLogToFile(
                            uuid,
                            {
                                level: "error",
                                title: "Failed to delete upload session",
                                description: `${error.value.data}`,
                            },
                            true
                        );
                    }
                }

                // delete from list
                upload_queue.value.splice(currentIndex, 1);

                clearInterval(intv);
                updateProgressState();
            }
        }, 300);
    }
};

/**
 * This function resets a file that is currently errored inside the upload queue.
 * @param uuid
 */
export const resetErroredUploadQueueItem = (uuid: String) => {
    const fileIndex = upload_queue.value.findIndex((e) => e.uuid === uuid);

    if (fileIndex >= 0 && upload_queue.value[fileIndex].errored) {
        const intv = setInterval(async () => {
            const currentIndex = upload_queue.value.findIndex((e) => e.uuid === uuid);
            if (currentIndex < 0) {
                clearInterval(intv);
                return;
            }
            
            const currentFile = upload_queue.value[currentIndex];
            if (currentFile.chuncks.filter(e => e.uploading).length === 0) {

                // reset file
                const newData: QueueItem = {
                    uuid,
                    size: currentFile.size,
                    file: currentFile.file,
                    name: currentFile.name,
                    folderId: currentFile.folderId,
                    progress: 0,
                    uploading: false,
                    paused: false,
                    fin: false,
                    log: [],
                    chuncks: [],
                }

                upload_queue.value[currentIndex] = newData;

                clearInterval(intv);
                updateProgressState();
            }
        }, 300);
    }
};

/**
 * This function resets a file that is currently errored inside the upload queue.
 * @param uuid
 */
export const resetAllErroredUploadQueueItem = () => {
    const files = upload_queue.value.filter(e => e.errored)
    for (const file of files) {
        const uuid = file.uuid;
        const intv = setInterval(async () => {
            const currentIndex = upload_queue.value.findIndex((e) => e.uuid === uuid);
            if (currentIndex < 0) {
                clearInterval(intv);
                return;
            }

            const currentFile = upload_queue.value[currentIndex];
            if (currentFile.chuncks.filter(e => e.uploading).length === 0) {

                // reset file
                const newData: QueueItem = {
                    uuid,
                    size: currentFile.size,
                    file: currentFile.file,
                    name: currentFile.name,
                    folderId: currentFile.folderId,
                    progress: 0,
                    uploading: false,
                    paused: false,
                    fin: false,
                    log: [],
                    chuncks: [],
                }

                upload_queue.value[currentIndex] = newData;

                clearInterval(intv);
                updateProgressState();
            }
        }, 300);
    }
};

/**
 * This function removes finished files from the upload queue.
 * @param uuid
 */
export const removedFinishedUploadQueueItem = () => {
    const finishedFiles = upload_queue.value.filter(e => e.fin)
    for (const file of finishedFiles) {
        const uuid = file.uuid;
        const currentIndex = upload_queue.value.findIndex((e) => e.uuid === uuid);
        if (currentIndex >= 0) {
            upload_queue.value.splice(currentIndex, 1);
        }
    }
    updateProgressState();
};

let uploader_intv = ref<string | number | NodeJS.Timeout | undefined>();
const startUploadWorker = () => {
    updateProgressState();
    paused_state.value = false;
    uploader_intv.value = setInterval(() => {
        if (parallel_files() <= max_parallel_files.value) {
            let item = upload_queue.value.find(
                (e) => !e.uploading && !e.fin && !e.errored
            );
            if (!item) {
                if (
                    upload_queue.value.length ===
                    upload_queue.value.filter((e) => e.fin || e.errored).length
                ) {
                    is_uploading_state.value = false;
                    if (uploader_intv.value) clearInterval(uploader_intv.value);
                }
                return;
            }
            startUploadFileWorker(item.uuid);
        }
    }, 500);
};
const stopUploadWorker = () => {
    paused_state.value = true;
    if (uploader_intv.value) clearInterval(uploader_intv.value);
};

const createUploadSession = async (uuid: String): Promise<ApiPcuSession | null> => {
    const conf = useRuntimeConfig();
    const token = useToken();
    const fileIndex = getFileIndexByUuid(uuid);
    if (fileIndex === null) return null;

    const form = new FormData();
    form.append("Name", `${upload_queue.value[fileIndex].name}`);
    form.append("Size", `${upload_queue.value[fileIndex].size}`);
    if (upload_queue.value[fileIndex].folderId > 0) {
        form.append("ParentFolderID", `${upload_queue.value[fileIndex].folderId}`);
    }

    return await $fetch<ApiPcuSession>(`${conf.public.apiUrl}/pcu/session`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token.value}`,
        },
        body: form,
    });
};

const startUploadFileWorker = async (uuid: String) => {
    const conf = useRuntimeConfig();

    let fileIndex = getFileIndexByUuid(uuid);
    if (fileIndex === null) {
        addLogToFile(
            uuid,
            {
                level: "error",
                title: "Failed to create upload session",
                description: `Failed to get fileIndex during worker start. ${uuid}`,
            },
            true
        );
        return;
    }
    upload_queue.value[fileIndex].uploading = true;
    updateProgressState();

    // create upload session
    let data: ApiPcuSession | null = null;
    try {
        data = await createUploadSession(uuid);
    } catch (e: any) {
        addLogToFile(
            uuid,
            {
                level: "error",
                title: "Failed to create upload session",
                description: e.data || e.message || "Failed to fetch session from API",
            },
            true
        );
        return;
    }
    
    if (!data) {
        addLogToFile(
            uuid,
            {
                level: "error",
                title: "Failed to create upload session",
                description: "Failed to fetch session from API",
            },
            true
        );
        return;
    }

    // add chunck list
    let chuncks: QueueItemChunck[] = [];
    for (let i = 0; i < data.ChunckCount; i++) {
        chuncks.push({
            index: i,
            uploading: false,
            fin: false,
        });
    }
    
    fileIndex = getFileIndexByUuid(uuid);
    if (fileIndex === null) {
        addLogToFile(
            uuid,
            {
                level: "error",
                title: "Failed to generate chunck list",
                description: `Failed to get fileIndex during chunck generation.`,
            },
            true
        );
        return;
    }
    upload_queue.value[fileIndex].chuncks = chuncks;
    upload_queue.value[fileIndex].session = data;
    updateProgressState();

    // upload chuncks
    const intv = setInterval(async () => {
        await waitForPause();
        if (parallel_chuncks() < max_parallel_chuncks.value && !paused_state.value) {
            let currentIndex = getFileIndexByUuid(uuid);
            if (currentIndex === null) {
                clearInterval(intv);
                return;
            }
            let chunckIndex = upload_queue.value[currentIndex].chuncks.findIndex(
                (e) => !e.uploading && !e.fin && !e.errored
            );
            if (chunckIndex < 0) {
                // If all chunks are either uploading, finished, or errored
                const unfinished = upload_queue.value[currentIndex].chuncks.some(e => !e.fin && !e.errored);
                if (!unfinished) {
                    clearInterval(intv);
                    finishUpload(uuid);
                }
                return;
            }
            startUploadChunck(uuid, chunckIndex).finally(() => {
                let fIndex = getFileIndexByUuid(uuid);
                if (fIndex === null) {
                    clearInterval(intv);
                    return;
                }
                // stopping upload if file errored
                if (upload_queue.value[fIndex].errored) {
                    clearInterval(intv);
                    return;
                }
            });
        }
    }, 100);

    /**
     * This function finished the upload session (closes the upload session)
     * and updates the serverFile property of the queued item with the data from the server .
     * @param uuid
     */
    const finishUpload = async (uuid: String) => {
        await new Promise((res) => {
            const innerIntv = setInterval(() => {
                let currentIndex = getFileIndexByUuid(uuid);
                if (currentIndex === null) {
                    clearInterval(innerIntv);
                    res(null);
                    return;
                }
                let unfinishedChuncks = upload_queue.value[currentIndex].chuncks.filter(e => !e.fin).length;
                if (unfinishedChuncks === 0) {
                    clearInterval(innerIntv);
                    res(null);
                }
            }, 500);
        });

        let currentIndex = getFileIndexByUuid(uuid);
        if (currentIndex === null) {
            return;
        }

        const sessionToken = upload_queue.value[currentIndex].session?.Token;
        if (!sessionToken) {
            addLogToFile(uuid, { level: "error", title: "Failed to finish upload", description: "Missing session token" }, true);
            return;
        }

        const token = useToken();
        const form = new FormData();
        form.append("SessionJwtToken", `${sessionToken}`);

        const { data, error } = await useFetch<ApiPcuFile>(
            `${conf.public.apiUrl}/pcu/file`,
            {
                method: "post",
                headers: {
                    Authorization: `Bearer ${token.value}`,
                },
                body: form,
                retry: 2,
            }
        );

        if (error.value) {
            addLogToFile(
                uuid,
                {
                    level: "error",
                    title: "Failed to finish upload",
                    description: `Response: ${error.value.data ? error.value.data : error.value.message}`,
                },
                true
            );
            return;
        }

        currentIndex = getFileIndexByUuid(uuid);
        if (currentIndex === null) {
            return;
        }
        upload_queue.value[currentIndex].serverFile = data.value ?? undefined;
        upload_queue.value[currentIndex].fin = true;
        upload_queue.value[currentIndex].uploading = false;
        upload_queue.value[currentIndex].progress = 100;
        updateProgressState();
    };
};

const startUploadChunck = async (uuid: String, chunckIndex: number, nth = 0) => {
    if (nth > max_retry_chuncks.value) {
        addLogToFile(
            uuid,
            {
                level: "error",
                title: "Failed to process chunck",
                description: `Exceeded max retry (${nth}) on uploading chunck.`,
            },
            true
        );
        return;
    }

    const conf = useRuntimeConfig();
    const token = useToken();
    updateProgressState();

    let fileIndex = getFileIndexByUuid(uuid);
    if (fileIndex === null) {
        return;
    }
    const currentFile = upload_queue.value[fileIndex];
    if (currentFile.deleted) {
        //skip chunck
        addLogToFile(
            uuid,
            {
                level: "info",
                title: "Skipping Chunck",
                description: `Skipped Chunck ${chunckIndex} because the file had been removed from the upload queue.`,
            },
            true
        );
        return;
    }
    currentFile.chuncks[chunckIndex].uploading = true;

    // upload chunck
    const fileSliceSize = Math.ceil(
        currentFile.size /
        currentFile.chuncks.length
    );
    const fileChunck = currentFile.file.slice(
        chunckIndex * fileSliceSize,
        (chunckIndex + 1) * fileSliceSize
    );

    const sessionToken = currentFile.session?.Token;
    if (!sessionToken) {
         addLogToFile(uuid, { level: "error", title: "Failed to upload chunck", description: "Missing session token" }, true);
         return;
    }

    // construct formdata
    const form = new FormData();
    form.append("SessionJwtToken", `${sessionToken}`);
    form.append("Index", `${chunckIndex}`);
    form.append("file", fileChunck, `${currentFile.name}`);

    // http requests
    await new Promise((resolvePromiseChunckUpload) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${conf.public.apiUrl}/pcu/chunck`, true);
        xhr.setRequestHeader("Authorization", `Bearer ${token.value}`);

        xhr.upload.onprogress = function (e) {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                if (percentComplete >= 95) {
                    resolvePromiseChunckUpload(null)
                }
            }
        };


        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                let fIndex = getFileIndexByUuid(uuid);
                if (fIndex === null) {
                    resolvePromiseChunckUpload(null);
                    return;
                }
                const f = upload_queue.value[fIndex];
                if (xhr.status === 200) {
                    f.chuncks[chunckIndex].errored = false;
                    f.chuncks[chunckIndex].uploading = false;
                    f.chuncks[chunckIndex].fin = true;
                    
                    f.progress = (100 / f.chuncks.length) * f.chuncks.filter((e) => e.fin).length;

                    updateProgressState();
                } else {
                    // Handle error
                    const status = xhr.status;
                    const error = xhr.responseText || xhr.statusText;

                    f.chuncks[chunckIndex].errored = true;
                    f.chuncks[chunckIndex].uploading = false;

                    // If session expired or is missing, try to get a new one
                    if (status === 401 || status === 403) {
                        createUploadSession(uuid).then((newSession) => {
                            if (newSession) {
                                const latestIdx = getFileIndexByUuid(uuid);
                                if (latestIdx !== null) upload_queue.value[latestIdx].session = newSession;
                            }
                            startUploadChunck(uuid, chunckIndex, nth + 1);
                        }).catch((e) => {
                            addLogToFile(
                                uuid,
                                {
                                    level: "error",
                                    title: "Failed to refresh upload session",
                                    description: e.data || e.message || "Failed to fetch session from API",
                                },
                                true
                            );
                        });
                    } else {
                        startUploadChunck(uuid, chunckIndex, nth + 1);
                    }

                    addLogToFile(
                        uuid,
                        {
                            level: "error",
                            title: "Failed to upload chunck",
                            description: `Chunck ${chunckIndex}: ${error} (Status: ${status})`,
                        },
                        false
                    );
                    updateProgressState();
                }
                resolvePromiseChunckUpload(null)
            }
        };
        xhr.send(form);
    })
};

const updateProgressState = () => {
    let p = 0;
    let i = 0;
    for (const item of upload_queue.value) {
        if (!item.errored) {
            i++;
            p += item.progress;
        }
    }
    if (i === 0) {
        progress_state.value = 0;
    } else {
        progress_state.value = Math.ceil(p / i);
    }
};

const addLogToFile = (uuid: String, log: QueueItemLog, errored = false) => {
    const fileIndex = upload_queue.value.findIndex((e) => e.uuid === uuid);
    if (fileIndex >= 0) {
        upload_queue.value[fileIndex].log.push(log);
        if (errored) {
            upload_queue.value[fileIndex].errored = true;
            upload_queue.value[fileIndex].uploading = false;
        }
    }
};
const getFileIndexByUuid = (uuid: String) => {
    const i = upload_queue.value.findIndex((e) => e.uuid === uuid);
    return i < 0 ? null : i;
};

const waitForPause = async () => {
    if (!paused_state.value) return;
    await new Promise((res) => {
        const intv = setInterval(() => {
            if (!paused_state.value) {
                clearInterval(intv);
                res(null);
            }
        }, 500);
    });
};