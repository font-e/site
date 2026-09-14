function getEmbedInfo(url) {
  if (!url) return null;
  const cleanUrl = url.trim();

  // YouTube (Links padrão, shorts, live, encurtados youtu.be)
  const ytMatch = cleanUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|live|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (ytMatch && ytMatch[1]) {
    const id = ytMatch[1];
    return {
      type: 'youtube',
      id,
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`,
      watchUrl: `https://www.youtube.com/watch?v=${id}`,
      thumbUrl: `https://img.youtube.com/vi/${id}/hqdefault.jpg`
    };
  }

  // Vimeo
  const vimeoMatch = cleanUrl.match(/(?:vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+))/i);
  if (vimeoMatch && vimeoMatch[1]) {
    const id = vimeoMatch[1];
    return {
      type: 'vimeo',
      id,
      embedUrl: `https://player.vimeo.com/video/${id}?dnt=1`,
      watchUrl: `https://vimeo.com/${id}`,
      thumbUrl: `https://vumbnail.com/${id}.jpg`
    };
  }

  return {
    type: 'external',
    id: '',
    embedUrl: cleanUrl,
    watchUrl: cleanUrl,
    thumbUrl: ''
  };
}

function getEventVideosParsed(evt) {
  let rawVideos = evt.videos;
  if (!rawVideos || !rawVideos.length) {
    const consolidated = findConsolidatedEvent(evt.rawTitle || evt.title || evt.id);
    if (consolidated && consolidated.videos && consolidated.videos.length) {
      rawVideos = consolidated.videos;
    }
  }

  if (Array.isArray(rawVideos)) {
    return rawVideos.map(v => {
      if (typeof v === 'string') {
        return { titulo: '', url: v, legenda: '' };
      }
      return {
        titulo: v.titulo || v.title || '',
        url: v.url || v.link || v.src || '',
        legenda: v.legenda || v.sinopse || v.ficha_tecnica || '',
        thumb: v.thumb_url || ''
      };
    }).filter(v => v.url || v.titulo);
  }

  return [];
}
