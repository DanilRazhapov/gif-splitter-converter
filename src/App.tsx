import { BrowserRouter, Routes, Route, Link } from "react-router-dom"
import { GifSplitterPage } from "./pages/GifSplitterPage"
import { Mp4ConverterPage } from "./pages/Mp4ConverterPage"

function App () {
    return (
        <BrowserRouter>
            <nav className="gap-4 p-4 flex flex-row justify-center items-center bg-steam-dark text-steam-text">
                <div className="text-steam-text bg-steam-hover px-2 py-1 rounded-lg">
                    <Link to="/splitter">Gif Splitter</Link>
                </div>

                <div className="text-steam-text bg-steam-hover px-2 py-1 rounded-lg">
                    <Link to="/converter">Mp4 Converter</Link>
                </div>
            </nav>

            <Routes>
                <Route path="/splitter" element={<GifSplitterPage />}/>
                <Route path="/converter" element={<Mp4ConverterPage />}/>
            </Routes>
        </BrowserRouter>
    )
}

export default App