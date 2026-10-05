import { useState, useRef, useMemo, useEffect } from "react"
import { splitGif } from "../gifSplitter"
import { Button } from "../components/Button"

export function GifSplitterPage() {   
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [isOver, setIsOver] = useState<boolean>(false)
    const [isProcessing, setIsProcessing] = useState<boolean>(false)

    const fileInputRef = useRef<HTMLInputElement>(null)

    const gifUrl = useMemo(
        () => (selectedFile ? URL.createObjectURL(selectedFile) : undefined),
        [selectedFile]
    )

    useEffect(() => {
        return () => { if (gifUrl) URL.revokeObjectURL(gifUrl) }
    }, [gifUrl])
    
    function handleChooseClick() {
        fileInputRef.current?.click()
    }

    function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0]
        if (file) {
            setSelectedFile(file)
        }
    }

    function handleDrop(event: React.DragEvent<HTMLDivElement>) {
        event.preventDefault()
        const file = event.dataTransfer.files[0]
        if (file) {
            setSelectedFile(file)
        }
    }

    async function handleSplitClick() {
        if (!selectedFile) {
            alert('Пожалуйста, выберите GIF файл')
            return
        }

        setIsProcessing(true)

        try {
            await splitGif(selectedFile)
        } catch(err) {
            console.error(err)
        } finally {
            setIsProcessing(false)
        }
    }

    return (
        <div className="flex flex-col items-center gap-4 bg-steam-bg">
            <input 
                type="file" 
                ref={fileInputRef} 
                style={{display: "none"}} 
                onChange={handleFileChange}
                accept=".gif"
            />

            <div 
                className={`relative w-full max-w-3xl border-2 aspect-video border-steam-accent rounded-2xl flex items-center justify-center 
                    ${isOver ? ' bg-steam-hover' 
                        : 'bg-steam-panel'}
                `}
                onDragEnter={(e) => e.preventDefault()}
                onDragOver={(e) => {
                    e.preventDefault();
                    setIsOver(true);
                }} 
                onDragLeave={() => setIsOver(false)}
                onDrop={(e) => {
                    setIsOver(false);
                    handleDrop(e);
                }}
            >   
                {selectedFile && <img className="w-full h-full object-contain rounded-2xl" src={gifUrl} />}
            </div>

            <div
                className="flex sm:flex-row gap-45 text-steam-text"
            >
                <Button onClick={handleChooseClick}
                size="lg"> 
                    Выбрать GIF 
                </Button>

                <Button
                    onClick={handleSplitClick}
                    disabled={isProcessing}
                    size="lg"
                >
                    {isProcessing ? 'Режу GIF...' : 'Разрезать и скачать'}
                </Button>
            </div>
        </div>
    )
}