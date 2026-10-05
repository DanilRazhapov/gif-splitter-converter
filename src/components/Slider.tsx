import * as Slider from '@radix-ui/react-slider'
import { useState, useRef } from 'react'

interface SliderProps {
    startTime: number
    duration: number
    videoDuration: number
    maxDuration?: number
    videoRef?: React.RefObject<HTMLVideoElement | null> 
    onTrimChange: (startTime: number, duration: number) => void
}

export function VideoSlider({startTime, duration, videoDuration, maxDuration, videoRef, onTrimChange,} : SliderProps) {
    const [local, setLocal] = useState<[number, number] | null>(null)
    const stopHandlerRef = useRef<(() => void) | null>(null)
    
    if (videoDuration <= 0) return null

    const value = local ?? [startTime, startTime + duration]

    return (
        <Slider.Root
            className='absolute left-4 right-4 bottom-12 flex items-center h-5'
            value={value}
            min={0}
            max={videoDuration}
            step={0.1}
            minStepsBetweenThumbs={1}
            onValueChange={(v) => {
                let [start, end] = v

                if (maxDuration && end - start > maxDuration) {
                    const prev = local ?? [startTime, startTime + duration]
                    const startMoved = start !== prev[0]
                    const endMoved = end !== prev[1]

                    if (endMoved && !startMoved) {
                        start = end - maxDuration
                    } else if (startMoved && !endMoved) {
                        end = start + maxDuration
                    } else {
                        end = start + maxDuration
                    }
                }
                setLocal([start, end])
            }}
            onValueCommit={() => {
                const [start, end] = local ?? [startTime, startTime + duration]
                onTrimChange(start, end - start)
                setLocal(null)

                const video = videoRef?.current
                console.log('videoRef:', video)
                if (!video) return
                
                video.currentTime = start

                video.addEventListener('seeked', () => {
                    video.muted = true
                    video.play().catch((e) => console.error('play rejected', e))
                }, { once: true })

                if (stopHandlerRef.current) {
                    video.removeEventListener('timeupdate', stopHandlerRef.current)
                    stopHandlerRef.current = null;
                }

                const stopHandler = () => {
                    if (video.currentTime >= end) {
                        video.pause()
                        video.removeEventListener('timeupdate', stopHandler)
                        stopHandlerRef.current = null
                    }
                }
                
                stopHandlerRef.current = stopHandler
                video.addEventListener('timeupdate', stopHandler)

                video.play().catch((e) => console.error('play rejected', e))
            }}
        >

            <Slider.Track className="relative grow h-1 rounded-full bg-white/30">
                <Slider.Range className="absolute h-full rounded-full bg-steam-hover" />
            </Slider.Track>

            <Slider.Thumb className="SliderThumb touch-none" aria-label="Start time" onPointerDown={() => videoRef?.current?.pause()}/>
            <Slider.Thumb className="SliderThumb touch-none" aria-label="End time" onPointerDown={() => videoRef?.current?.pause()} />

        </Slider.Root>
    )
}