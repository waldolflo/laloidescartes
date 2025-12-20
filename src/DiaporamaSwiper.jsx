import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectFade } from "swiper/modules";

import "swiper/css";
import "swiper/css/effect-fade";

export default function DiaporamaSwiper() {
  const [images, setImages] = useState([]);

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    const { data } = await supabase
      .storage
      .from("diaporama")
      .list("", { sortBy: { column: "created_at", order: "asc" } });

    if (data) setImages(data.filter(f => f.name));
  };

  if (!images.length) return null;

  return (
    <Swiper
      modules={[Autoplay, EffectFade]}
      effect="fade"
      autoplay={{ delay: 4000, disableOnInteraction: false }}
      loop
      className="w-full max-w-5xl h-[400px] rounded-xl overflow-hidden"
    >
      {images.map((img) => {
        const { publicUrl } = supabase
          .storage
          .from("diaporama")
          .getPublicUrl(img.name).data;

        return (
          <SwiperSlide key={img.name}>
            <img
              src={publicUrl}
              className="w-full h-full object-cover"
            />
          </SwiperSlide>
        );
      })}
    </Swiper>
  );
}
