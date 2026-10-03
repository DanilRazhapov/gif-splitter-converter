import { BrowserRouter, Routes, Route, Link } from "react-router-dom"
import { GifSplitterPage } from "./pages/GifSplitterPage"
import { Mp4ConverterPage } from "./pages/Mp4ConverterPage"

function App () {
    return (
        <BrowserRouter>
            <nav className="gap-4 p-4 flex flex-row justify-center items-center bg-steam-dark text-steam-text">
                <Link to="/splitter" className="text-steam-text">Gif Splitter</Link>
                <Link to="/converter" className="text-steam-text">Mp4 Converter</Link>
            </nav>

            <Routes>
                <Route path="/splitter" element={<GifSplitterPage />}/>
                <Route path="/converter" element={<Mp4ConverterPage />}/>
            </Routes>
        </BrowserRouter>
    )
}

export default App