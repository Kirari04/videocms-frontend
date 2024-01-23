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

const allowed_extensions = ["mp4", "mkv", "webm", "avi", "mov"];

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
        upload_queue.value!.push({
            uuid,
            size: file.size,
            file: file,
            name: file.name,
            folderId: folderPathHistory.value[folderPathHistory.value.length - 1].folderId ?? 0,
            progress: 0,
            uploading: false,
            paused: false,
            fin: false,
            log: [],
            chuncks: [],
        });

        if (!allowed_extensions.includes(ext)) {
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
            const fileIndex = upload_queue.value.findIndex((e) => e.uuid === uuid);
            if (upload_queue.value[fileIndex].chuncks.filter(e => e.uploading).length === 0) {
                // delete session
                const conf = useRuntimeConfig();
                const token = useToken();
                const { error } = await useFetch<string>(`${conf.public.apiUrl}/pcu/session`, {
                    method: "delete",
                    headers: {
                        Authorization: `Bearer ${token.value}`,
                    },
                    body: {
                        UploadSessionUUID: upload_queue.value[fileIndex].session?.UUID,
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

                // delete from list
                upload_queue.value.splice(fileIndex, 1);

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
            const fileIndex = upload_queue.value.findIndex((e) => e.uuid === uuid);
            const currentFile = upload_queue.value[fileIndex];
            if (upload_queue.value[fileIndex].chuncks.filter(e => e.uploading).length === 0) {

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

                upload_queue.value[fileIndex] = newData;

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
        const intv = setInterval(async () => {
            const fileIndex = upload_queue.value.findIndex((e) => e.uuid === file.uuid);
            const currentFile = upload_queue.value[fileIndex];
            if (upload_queue.value[fileIndex].chuncks.filter(e => e.uploading).length === 0) {

                // reset file
                const newData: QueueItem = {
                    uuid: file.uuid,
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

                upload_queue.value[fileIndex] = newData;

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
    const files = upload_queue.value.filter(e => e.fin)
    for (const file of files) {
        const intv = setInterval(async () => {
            const fileIndex = upload_queue.value.findIndex((e) => e.uuid === file.uuid);
            // delete from list
            upload_queue.value.splice(fileIndex, 1);
            clearInterval(intv);
            updateProgressState();
        }, 300);
    }
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
                    clearInterval(uploader_intv.value);
                }
                return;
            }
            startUploadFileWorker(item.uuid);
        }
    }, 500);
};
const stopUploadWorker = () => {
    paused_state.value = true;
    clearInterval(uploader_intv.value);
};

const startUploadFileWorker = async (uuid: String) => {
    const conf = useRuntimeConfig();
    const token = useToken();

    let fileIndex = getFileIndexByUuid(uuid);
    if (fileIndex === null) {
        addLogToFile(
            uuid,
            {
                level: "error",
                title: "Failed to create upload session",
                description: `Failed to get fileIndex during formdata population. ${uuid}`,
            },
            true
        );
        return;
    }
    upload_queue.value[fileIndex].uploading = true;
    updateProgressState();

    const form = new FormData();
    form.append("Name", `${upload_queue.value[fileIndex].name}`);
    form.append("Size", `${upload_queue.value[fileIndex].size}`);
    if (upload_queue.value[fileIndex].folderId > 0) {
        form.append("ParentFolderID", `${upload_queue.value[fileIndex].folderId}`);
    }
    // create upload session
    const { data, error } = await useFetch<ApiPcuSession>(
        `${conf.public.apiUrl}/pcu/session`,
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
                title: "Failed to create upload session",
                description: `${error.value.data ? error.value.data : error.value.message
                    }`,
            },
            true
        );
        return;
    }
    if (!data.value) {
        addLogToFile(
            uuid,
            {
                level: "error",
                title: "Failed to create upload session",
                description: `Js error: data.value doesn't contain response`,
            },
            true
        );
        return;
    }

    // add chunck list
    let chuncks: QueueItemChunck[] = [];
    for (let i = 0; i < data.value.ChunckCount; i++) {
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
    upload_queue.value[fileIndex].session = data.value;
    updateProgressState();

    // upload chuncks
    const intv = setInterval(async () => {
        await waitForPause();
        if (parallel_chuncks() < max_parallel_chuncks.value && !paused_state.value) {
            let fileIndex = getFileIndexByUuid(uuid);
            if (fileIndex === null) {
                addLogToFile(
                    uuid,
                    {
                        level: "error",
                        title: "Failed to process chunck list",
                        description: `Failed to get fileIndex during chunck processing.`,
                    },
                    true
                );
                clearInterval(intv);
                return;
            }
            let chunckIndex = upload_queue.value[fileIndex].chuncks.findIndex(
                (e) => !e.uploading && !e.fin && !e.errored
            );
            if (chunckIndex < 0) {
                clearInterval(intv);
                finishUpload(uuid);
                return;
            }
            startUploadChunck(uuid, chunckIndex).finally(() => {
                let fileIndex = getFileIndexByUuid(uuid);
                if (fileIndex === null) {
                    addLogToFile(
                        uuid,
                        {
                            level: "error",
                            title: "Failed to process chunck list",
                            description: `Failed to get fileIndex during chunck processing finally.`,
                        },
                        true
                    );
                    clearInterval(intv);
                    return;
                }
                // stopping upload if chuncks failing
                if (upload_queue.value[fileIndex].errored) {
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
            const intv = setInterval(() => {
                let fileIndex = getFileIndexByUuid(uuid);
                if (fileIndex === null) {
                    addLogToFile(
                        uuid,
                        {
                            level: "error",
                            title: "Failed to finish upload",
                            description: `Failed to get fileIndex finish upload.`,
                        },
                        true
                    );
                    return;
                }
                let unfinishedChuncks = upload_queue.value[fileIndex].chuncks.filter(e => !e.fin).length;
                console.log(upload_queue.value[fileIndex].name, "unfinishedChuncks", unfinishedChuncks)
                if (unfinishedChuncks === 0) {
                    clearInterval(intv);
                    res(null);
                }
            }, 500);
        });
        let fileIndex = getFileIndexByUuid(uuid);
        if (fileIndex === null) {
            addLogToFile(
                uuid,
                {
                    level: "error",
                    title: "Failed to finish upload",
                    description: `Failed to get fileIndex before finish upload.`,
                },
                true
            );
            return;
        }
        const token = useToken();
        const form = new FormData();
        form.append(
            "SessionJwtToken",
            `${upload_queue.value[fileIndex].session?.Token}`
        );
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
                    description: `Response: ${error.value.data
                        ? error.value.data
                        : error.value.message
                        }`,
                },
                true
            );
            return;
        }

        fileIndex = getFileIndexByUuid(uuid);
        if (fileIndex === null) {
            addLogToFile(
                uuid,
                {
                    level: "error",
                    title: "Failed to finish upload",
                    description: `Failed to get fileIndex finish upload.`,
                },
                true
            );
            return;
        }
        upload_queue.value[fileIndex].serverFile = data.value ?? undefined;
        upload_queue.value[fileIndex].fin = true;
        upload_queue.value[fileIndex].uploading = false;
        upload_queue.value[fileIndex].progress = 100;
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
        startUploadChunck(uuid, chunckIndex, nth + 1)
        addLogToFile(
            uuid,
            {
                level: "error",
                title: "Failed to process chunck",
                description: `Failed to get fileIndex during chunck upload.`,
            },
            false
        );
        return;
    }
    if (upload_queue.value[fileIndex].deleted) {
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
    upload_queue.value[fileIndex].chuncks[chunckIndex].uploading = true;

    // upload chunck
    const fileSliceSize = Math.ceil(
        upload_queue.value[fileIndex].size /
        upload_queue.value[fileIndex].chuncks.length
    );
    const fileChunck = upload_queue.value[fileIndex].file.slice(
        chunckIndex * fileSliceSize,
        (chunckIndex + 1) * fileSliceSize
    );

    // construct formdata
    const form = new FormData();
    form.append(
        "SessionJwtToken",
        `${upload_queue.value[fileIndex].session?.Token}`
    );
    form.append("Index", `${chunckIndex}`);
    form.append("file", fileChunck, `${upload_queue.value[fileIndex].name}`);

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
                fileIndex = getFileIndexByUuid(uuid);
                if (fileIndex === null) {
                    startUploadChunck(uuid, chunckIndex, nth + 1)
                    addLogToFile(
                        uuid,
                        {
                            level: "error",
                            title: "Failed to process chunck response",
                            description: `Failed to get fileIndex during chunck response processing.`,
                        },
                        false
                    );
                    return;
                }
                if (xhr.status === 200) {
                    upload_queue.value[fileIndex].progress =
                        (100 / upload_queue.value[fileIndex].chuncks.length) *
                        upload_queue.value[fileIndex].chuncks.filter((e) => e.fin).length;

                    upload_queue.value[fileIndex].chuncks[chunckIndex].errored = false;
                    upload_queue.value[fileIndex].chuncks[chunckIndex].uploading = false;
                    upload_queue.value[fileIndex].chuncks[chunckIndex].fin = true;

                    updateProgressState();
                } else {
                    // Handle error
                    const error = xhr.statusText;

                    upload_queue.value[fileIndex].chuncks[chunckIndex].errored = true;
                    upload_queue.value[fileIndex].chuncks[chunckIndex].uploading = false;
                    startUploadChunck(uuid, chunckIndex, nth + 1)
                    addLogToFile(
                        uuid,
                        {
                            level: "error",
                            title: "Failed to upload chunck",
                            description: `Chunck ${chunckIndex}: ${error}`,
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



    // create upload session
    // const { error } = await useFetch<string>(
    //     `${conf.public.apiUrl}/pcu/chunck`,
    //     {
    //         method: "post",
    //         headers: {
    //             Authorization: `Bearer ${token.value}`,
    //         },
    //         body: form,
    //         retry: max_retry_chunck.value,
    //     }
    // );
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
    progress_state.value = Math.ceil(p / i);
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
        setInterval(() => {
            if (!paused_state.value) res(null);
        }, 500);
    });
};
