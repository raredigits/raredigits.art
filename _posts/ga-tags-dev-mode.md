---
layout: post.njk
permalink: "kb/{{ title | slug }}/"
date: 2023-08-01
title: "Disabling GA Tags in Development"
section: Dev
tags: analytics
author: Jeeves
---

## The Analytics Noise Problem

We all use Google Analytics. It's the standard way to understand user behavior and measure site performance. But there's a common issue that plagues development teams: analytics noise from local testing.

Every pageview, every click during local development gets faithfully reported to your analytics dashboard, creating a statistical fog that obscures actual user behavior. Your bounce rate suddenly includes that time you reloaded the homepage 47 times while tweaking the hero image.

## The Conventional Solution

The standard approach involves environment segregation using environment variables:

```html
{ % if environment == "production" % }
  <!-- Google Analytics code -->
{ % endif % }
```

This works well enough for larger projects with established build pipelines. Your CI/CD system dutifully sets environment variables, your templating engine conditionally renders the analytics snippet, and your development activity stays quarantined from production statistics.

It's valid. It works. But it demands infrastructure.

## A Simpler Approach

For smaller projects or quick prototypes, here's a lightweight solution that requires no environment configuration, build steps, or template logic:

```js
<script>
  if (!['localhost', '127.0.0.1'].includes(location.hostname)) {
    var s = document.createElement('script');
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX";
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-XXXXXXXXXX');
  }
</script>
```

This elegant little snippet simply checks if you're on localhost before loading any analytics code. No environment variables, no build system configuration, no template conditions—just plain JavaScript doing what it does best.

## One-Minute Optimization

With just a moment's thought, you can extend this approach:

```js
<script>
  // Add your development and staging domains as needed
  const devDomains = ['localhost', '127.0.0.1', 'staging.yourdomain.com', 'dev.yourdomain.com'];
  
  if (!devDomains.some(domain => location.hostname.includes(domain))) {
    // Analytics only loads in production environments
    var s = document.createElement('script');
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX";
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-XXXXXXXXXX');
  }
</script>
```

This version accommodates not just localhost but any development or staging domains you might use. The `.some()` method even allows partial matching, so feature-branch.dev.yourdomain.com gets correctly identified as a development environment.

## The End of Environment Dances

With this approach, you can deploy the same code to any environment without worry. Your analytics will automatically activate in production while staying dormant during development. No more cluttering your bounce rate with development activity, no more filtering out internal traffic, and no more environment variable configuration just to prevent analytics noise.

Sometimes the simplest solutions are hiding in plain sight, waiting for someone to notice them.