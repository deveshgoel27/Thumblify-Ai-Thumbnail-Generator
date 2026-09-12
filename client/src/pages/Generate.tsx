import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom"
import { colorSchemes, type AspectRatio, type IThumbnail, type ThumbnailStyle } from "../assets/assets";
import SoftBackDrop from "../components/SoftBackDrop";

import AspectRatioSelector from "../components/AspectRatioSelector";
import StyleSelector from "../components/StyleSelector";
import ColorSchemeSelector from "../components/ColorSchemeSelector";
import PreviewPanel from "../components/PreviewPanel";
import { useAuth } from "../Context/AuthContext";
import toast from "react-hot-toast";
import api from "../configs/Api";

const Generate = () => {

  const { id } = useParams();
  const {pathname} = useLocation();
  const {isLoggedIn} = useAuth();


  const [title, setTitle] = useState("");
  const [additionalDetails, setAdditionalDetails] = useState("");

  const [thumbnail, setThumbnail] = useState<IThumbnail | null>(null);
  const [loading, setLoading] = useState(false);

  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [colorSchemeId, setColorSchemeId] = useState<string>(colorSchemes[0].id);
  const [style, setStyle] = useState<ThumbnailStyle>("Bold & Graphic");

  const [styleDropdownOpen, setStyleDropdownOpen] = useState(false);

  const resetForm = () => {
    setTitle("");
    setAdditionalDetails("");
    setAspectRatio("16:9");
    setColorSchemeId(colorSchemes[0].id);
    setStyle("Bold & Graphic");
  }

  const handleGenerate = async () => {
      if(!isLoggedIn) return toast.error('Please login to generate thumbnails')
      if(!title.trim()) return toast.error('Title is required')
      if(loading) return toast.error('Generation already in progress')

      setLoading(true)
      // Clear the previous result so the loader uses the newly selected aspect ratio
      setThumbnail(null)

      try {
        const api_payload = {
          title,
          prompt:additionalDetails,
          style,
          aspect_ratio: aspectRatio,
          color_scheme: colorSchemeId,
          text_overlay: true,
        }

        const {data} = await api.post('/api/thumbnail/generate', api_payload);
        if(data.thumbnail){
          // Show the result here instead of navigating to /generate/:id — that
          // page refills the form from the saved thumbnail, so the old inputs
          // stuck around (even after a refresh). Now the form is ready for the
          // next thumbnail, a refresh starts fresh, and the result stays
          // available in My Generations.
          setThumbnail(data.thumbnail as IThumbnail);
          resetForm();
          toast.success(data.message);
        }
      } catch (error: any) {
        const status = error?.response?.status;
        const message = error?.response?.data?.message || error.message;
        
        console.error(`[API Error] Status: ${status}, Message: ${message}`);
        
        if (status === 429) {
          toast.error(message || 'Quota exceeded. Please try again later');
        } else if (status === 500) {
          toast.error('Server error. Thumbnail generation failed');
        } else {
          toast.error(message || 'Failed to generate thumbnail');
        }
      } finally {
        setLoading(false);
      }
  }    

  const fetchThumbnail = async () => {
   try {
    const {data} = await api.get(`/api/user/thumbnail/${id}`);

    if (!data?.thumbnail) {
      // Record doesn't exist — e.g. generation failed server-side and was
      // rolled back. Stop polling instead of spinning forever with no
      // feedback (loading would otherwise stay stuck true indefinitely).
      setThumbnail(null);
      setLoading(false);
      toast.error('This thumbnail could not be generated. Please try again.');
      return;
    }

    setThumbnail(data.thumbnail as IThumbnail);
    setLoading(!data.thumbnail.image_url);
    setAdditionalDetails(data.thumbnail.user_prompt)
    setTitle(data.thumbnail.title)
    setColorSchemeId(data.thumbnail.color_scheme)
    setAspectRatio(data.thumbnail.aspect_ratio)
    setStyle(data.thumbnail.style)
   } catch (error: any) {
        console.log(error);
        toast.error(error?.response?.data?.message || error.message)
        setLoading(false);
   }
}

  useEffect(() => {
    if (isLoggedIn && id) {
      fetchThumbnail();
    }
    if(id && loading && isLoggedIn){
      const interval = setInterval(()=> {
        fetchThumbnail()
      },5000);
      return ()=> clearInterval(interval)
    }
  }, [id, loading, isLoggedIn])

  // Coming from a saved thumbnail's page (/generate/:id) back to /generate:
  // the component is reused, so clear what that page loaded into the form
  useEffect(()=>{
    if(!id){
      setThumbnail(null)
      setLoading(false)
      resetForm()
    }
  },[pathname])


  return (
    <>
      <SoftBackDrop />
      <div className="pt-24 min-h-screen">
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28 lg:pb-8">
          <div className="grid lg:grid-cols-[400px_1fr] gap-8">
            {/* LEFT PANEL  */}
            <div className={`space-y-6 ${id && "pointer-events-none"}`}>
              <div className="p-6 rounded-2xl bg-white/8 border border-white/12 shadow-xl space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-zinc-100 mb-1">Create Your Thumbnail</h2>
                  <p className="text-sm text-zinc-400">Describe your vision and let AI bring it to life</p>
                </div>

                <div className="space-y-5">
                  {/* TITLE INPUT  */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Title or Topic</label>
                    <input type="text" value={title}
                      onChange={(e) => setTitle(e.target.value)} maxLength={100}
                      placeholder="e.g., 10 Tips for Better Sleep" className="w-full px-4 py-3 rounded-lg border border-white/12 bg-black/20 text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                    <div className="flex justify-end">
                      <span className="text-xs text-zinc-400">{title.length}/100</span>
                    </div>
                  </div>
                  {/* AspectRatioSelector  */}
                  <AspectRatioSelector value={aspectRatio} onChange={setAspectRatio} />
                  {/* StyleSelector  */}
                  <StyleSelector value={style} onChange={setStyle} isOpen={styleDropdownOpen} setIsOpen={setStyleDropdownOpen} />
                  {/* ColorSchemeSelector  */}
                  <ColorSchemeSelector value={colorSchemeId} onChange={setColorSchemeId} />
                  {/* Details  */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">
                      Additional Prompts
                      <span className="text-zinc-400 text-xs">(Optional)</span>
                    </label>
                    <textarea value={additionalDetails} onChange={(e) => setAdditionalDetails(e.target.value)} rows={3} className="w-full px-4 py-3 rounded-lg border border-white/10 bg-white/6 text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none" placeholder="Add any specific elements, mood, or style preferences..." />
                  </div>
                </div>

                {/* BUTTON  */}
                {!id && (
                  <button onClick={handleGenerate} disabled={loading} className="text-[15px] w-full py-3.5 rounded-xl font-medium bg-linear-to-b from-pink-500 to-pink-600 hover:from-pink-700 disabled:cursor-not-allowed transition-colors">
                    {loading ? "Generating..." : "Generate Thumbnail"}
                  </button>
                )}
              </div>
            </div>
            {/* RIGHT PANEL  */}
            <div>
              <div className="p-6 rounded-2xl bg-white/8 border-white/10 shadow-xl">
                <h2 className="text-lg font-semibold text-zinc-100 mb-4">Preview</h2>
                {/* A shown thumbnail keeps its own ratio, even after the form resets */}
                <PreviewPanel thumbnail={thumbnail} isLoading={loading} aspectRatio={thumbnail?.aspect_ratio ?? aspectRatio} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}

export default Generate