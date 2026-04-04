import React, { useEffect, useMemo, useState } from 'react';
import { ImageVariantUrls } from '../../types';

interface ProgressiveImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  variants?: ImageVariantUrls | null;
  fallbackSrc?: string;
}

const preloadImage = (url: string, onSuccess: () => void): (() => void) => {
  const image = new Image();
  image.onload = onSuccess;
  image.src = url;

  return () => {
    image.onload = null;
  };
};

const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  src,
  variants,
  fallbackSrc = '',
  loading,
  ...imgProps
}) => {
  const { onLoad, onError, ...restImgProps } = imgProps;

  const sources = useMemo(() => {
    const small = variants?.small || src || fallbackSrc;
    const medium = variants?.medium || variants?.large || src || fallbackSrc;
    const large = variants?.large || medium || small;

    return { small, medium, large };
  }, [fallbackSrc, src, variants]);

  const [activeSrc, setActiveSrc] = useState<string>(sources.small);

  useEffect(() => {
    setActiveSrc(sources.small);
  }, [sources.small]);

  useEffect(() => {
    if (!sources.medium || sources.medium === sources.small) {
      return undefined;
    }

    return preloadImage(sources.medium, () => {
      setActiveSrc((current) => (current === sources.large ? current : sources.medium));
    });
  }, [sources.large, sources.medium, sources.small]);

  useEffect(() => {
    if (!sources.large || sources.large === sources.medium || sources.large === sources.small) {
      return undefined;
    }

    let releasePreload: (() => void) | null = null;
    const loadLargeVariant = () => {
      releasePreload = preloadImage(sources.large, () => {
        setActiveSrc(sources.large);
      });
    };

    if (document.readyState === 'complete') {
      loadLargeVariant();
      return () => {
        if (releasePreload) {
          releasePreload();
        }
      };
    }

    window.addEventListener('load', loadLargeVariant, { once: true });

    return () => {
      window.removeEventListener('load', loadLargeVariant);
      if (releasePreload) {
        releasePreload();
      }
    };
  }, [sources.large, sources.medium, sources.small]);

  return (
    <img
      {...restImgProps}
      src={activeSrc || fallbackSrc}
      loading={loading || 'lazy'}
      onLoad={(event) => {
        if (onLoad) {
          onLoad(event);
        }
      }}
      onError={(event) => {
        if (onError) {
          onError(event);
        }
      }}
    />
  );
};

export default ProgressiveImage;
