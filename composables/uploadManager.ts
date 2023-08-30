import { v4 as uuidv4 } from "uuid";
import { ref } from "vue";

export interface QueueItem {
    uuid: String;
    name: String;
    progress: number;
    uploading: boolean;
    activeUploads: number;
    log: QueueItemLog[];
    errored?: boolean;
    retryable?: boolean;
    deleted?: boolean;
}

export interface QueueItemLog {
    level: "warn" | "error" | "info";
    title: String;
    description?: String;
}

const allowed_extensions = ["mp4", "mkv", "webm", "avi"];

const upload_queue = ref<QueueItem[]>([]);
const is_uploading_state = ref<boolean>(false);
const progress_state = ref<number>(0);

const uploader_intv = ref<NodeJS.Timer>();
const parallel_file_uploads_state = ref<number>(0);
const max_parallel_file_uploads_state = ref<number>(1);

export const getUploadQueue = () => upload_queue;
export const addToUploadQueue = (files: FileList) => {
    for (const file of files) {
        const ext = file.name.split(".").pop() ?? "";
        const uuid = uuidv4();
        upload_queue.value!.push({
            uuid,
            name: file.name,
            progress: 0,
            activeUploads: 0,
            uploading: false,
            log: [],
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
export const startUploadQueue = () => {
    if (!is_uploading_state.value) {
        is_uploading_state.value = true;
        startUploadWorker();
    }
};
export const stopUploadQueue = () => {
    if (is_uploading_state.value) {
        stopUploadWorker();
        is_uploading_state.value = false;
    }
};
export const isUploadingState = () => is_uploading_state;
export const getUploadProgress = () => progress_state;

const startUploadWorker = () => {
    uploader_intv.value = setInterval(() => {
        if (
            parallel_file_uploads_state.value <
            max_parallel_file_uploads_state.value
        ) {
            let item = upload_queue.value.find((e) => !e.uploading);
            if (item) {
                startUploadFileWorker(item.uuid);
            }
        }
    }, 500);
};
const stopUploadWorker = () => {
    clearInterval(uploader_intv.value);
};

const startUploadFileWorker = (uuid: String) => {};

const updateProgressState = () => {
    let p = 0;
    for (const item of upload_queue.value) {
        p += item.progress;
    }
    progress_state.value = Math.floor(p / upload_queue.value.length);
};
const addLogToFile = (uuid: String, log: QueueItemLog, errored = false) => {
    const fileIndex = upload_queue.value.findIndex((e) => e.uuid === uuid);
    if (fileIndex >= 0) {
        upload_queue.value[fileIndex].errored = errored;
        upload_queue.value[fileIndex].log.push(log);
    }
};
export const removeUploadQueueItem = (uuid: String) => {
    const fileIndex = upload_queue.value.findIndex((e) => e.uuid === uuid);

    if (fileIndex >= 0 && !upload_queue.value[fileIndex].deleted) {
        upload_queue.value[fileIndex].deleted = true;
        const intv = setInterval(() => {
            if (upload_queue.value[fileIndex].activeUploads === 0) {
                upload_queue.value.splice(fileIndex, 1);
                clearInterval(intv);
            }
        }, 300);
    }
};
