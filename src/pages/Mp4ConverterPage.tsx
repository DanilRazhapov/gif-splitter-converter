import { useState, useRef, useMemo, useEffect } from "react"
import { mp4ToGif } from "../gifConverter";
import { splitGif } from "../gifSplitter";
import downloadBlob from "../components/download";
import { Button } from "../components/Button";
import { VideoSlider } from "../components/Slider";

export function Mp4ConverterPage () {
    const [selectedMp4, setSelectedMp4] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);

    const [startTime, setStartTime] = useState<number>(0);
    const [duration, setDuration] = useState<number>(5);
    const [videoDuration, setVideoDuration] = useState<number>(30)

    const mp4InputRef = useRef<HTMLInputElement>(null)
    const videoRef = useRef<HTMLVideoElement>(null)

    const videoUrl = useMemo(
        () => (selectedMp4 ? URL.createObjectURL(selectedMp4) : undefined),
        [selectedMp4]
    )

    useEffect(() => {
        return () => {
            if (videoUrl) URL.revokeObjectURL(videoUrl)
        }
    }, [videoUrl])

    function handleChooseClick() {
        mp4InputRef.current?.click()
    }

    function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
        const mp4 = event.target.files?.[0]
        if (mp4) {
            setSelectedMp4(mp4)
        }
    }

    async function handleConvertClick() {
        if(!selectedMp4) {
            alert('Пожалуйста выберите mp4 файл')
            return
        }

        setIsProcessing(true)

        try {
            const gifBlob = await mp4ToGif(selectedMp4, startTime, duration)
            downloadBlob(gifBlob, `converted_${Date.now()}.gif`)
        } catch (err) {
            console.error(err)
        } finally {
            setIsProcessing(false)
        }
    }

    async function handleClickAndSplit() {
        if (!selectedMp4) {
            alert('Пожалуйста выберите mp4 файл')
            return
        }

        if (duration > 10) {
            const confirmed = confirm(
                `Вы выбрали ${duration} секунд - обработка может занять время. Продолжить?`
            )

            if (!confirmed) return
        }

        setIsProcessing(true)
        try {
            const gifBlob = await mp4ToGif(selectedMp4, startTime, duration)
            const gifFile = new File([gifBlob], 'converted.gif', { type: 'image/gif'})
            await splitGif(gifFile)
        } catch (err) {
            console.error(err)
        } finally {
            setIsProcessing(false)
        }
    }

    return (
        <div className="flex flex-col items-center gap-4 text-steam-text">
            <div className="relative w-full max-w-3xl aspect-video border-steam-accent border-2 rounded-2xl bg-steam-panel">
                {selectedMp4 && (
                    <video
                        ref={videoRef}
                        src={videoUrl}
                        className="w-full h-full rounded-2xl object-contain"
                        onLoadedMetadata={(e) =>
                            setVideoDuration(e.currentTarget.duration)
                        }
                        muted
                    />
                )}

                {selectedMp4 && (
                    <VideoSlider
                        startTime={startTime}
                        duration={duration}
                        videoDuration={videoDuration}
                        maxDuration={15}
                        videoRef={videoRef}
                        onTrimChange={(s, d) => {
                            setStartTime(s)
                            setDuration(d)
                        }}
                    />
                )}
            </div>
            <input
                type="file" 
                ref={mp4InputRef}
                onChange={handleFileChange}
                style={{display: "none"}}
                accept=".mp4,video/mp4"
            />
            <div className="flex gap-21">
                <Button
                size="md"
                onClick={handleChooseClick}
            >
                Выбрать Mp4
            </Button>

            <Button
                onClick={handleConvertClick}
                size="md"
                disabled={isProcessing}
            >
                {isProcessing ? "Конвертирую..." : "Конвертировать и скачать"}
            </Button>

            <Button
                onClick={handleClickAndSplit}
                size="md"
                disabled={isProcessing}
            >
                {isProcessing ? "Конвертирую и режу..." : "Конвертировать и разрезать"}
            </Button>
            </div>
        </div>
    )
}