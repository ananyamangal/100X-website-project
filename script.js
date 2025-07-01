// Mobile Navigation Toggle
document.addEventListener("DOMContentLoaded", () => {
  const navToggle = document.querySelector(".nav-toggle")
  const navMenu = document.querySelector(".nav-menu")

  if (navToggle && navMenu) {
    navToggle.addEventListener("click", () => {
      navMenu.classList.toggle("active")
      navToggle.classList.toggle("active")
    })

    // Close menu when clicking on a link
    const navLinks = document.querySelectorAll(".nav-link")
    navLinks.forEach((link) => {
      link.addEventListener("click", () => {
        navMenu.classList.remove("active")
        navToggle.classList.remove("active")
      })
    })

    // Close menu when clicking outside
    document.addEventListener("click", (event) => {
      if (!navToggle.contains(event.target) && !navMenu.contains(event.target)) {
        navMenu.classList.remove("active")
        navToggle.classList.remove("active")
      }
    })
  }

  // Smooth scrolling for anchor links
  const anchorLinks = document.querySelectorAll('a[href^="#"]')
  anchorLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault()
      const targetId = this.getAttribute("href")
      const targetElement = document.querySelector(targetId)

      if (targetElement) {
        const headerHeight = document.querySelector(".header").offsetHeight
        const targetPosition = targetElement.offsetTop - headerHeight

        window.scrollTo({
          top: targetPosition,
          behavior: "smooth",
        })
      }
    })
  })

  // Fade in animation on scroll
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px",
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible")
      }
    })
  }, observerOptions)

  // Add fade-in class to elements and observe them
  const elementsToAnimate = document.querySelectorAll(
    ".product-card, .mission-card, .feature-item, .highlight-item, .testimonial-item",
  )
  elementsToAnimate.forEach((el) => {
    el.classList.add("fade-in")
    observer.observe(el)
  })

  // Contact form handling
  const contactForm = document.getElementById("contactForm")
  if (contactForm) {
    contactForm.addEventListener("submit", function (e) {
      e.preventDefault()

      // Get form data
      const formData = new FormData(this)
      const name = formData.get("name")
      const phone = formData.get("phone")
      const email = formData.get("email")
      const subject = formData.get("subject")
      const message = formData.get("message")

      // Create WhatsApp message
      let whatsappMessage = `Hello! I'm ${name}.\n\n`
      whatsappMessage += `Phone: ${phone}\n`
      if (email) whatsappMessage += `Email: ${email}\n`
      if (subject) whatsappMessage += `Subject: ${subject}\n`
      whatsappMessage += `\nMessage: ${message}`

      // Encode message for URL
      const encodedMessage = encodeURIComponent(whatsappMessage)
      const whatsappURL = `https://wa.me/91XXXXXXXXXX?text=${encodedMessage}`

      // Open WhatsApp
      window.open(whatsappURL, "_blank")

      // Show success message
      alert("Thank you for your message! You will be redirected to WhatsApp to send your inquiry.")

      // Reset form
      this.reset()
    })
  }

  // Header scroll effect
  let lastScrollTop = 0
  const header = document.querySelector(".header")

  window.addEventListener("scroll", () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop

    if (scrollTop > lastScrollTop && scrollTop > 100) {
      // Scrolling down
      header.style.transform = "translateY(-100%)"
    } else {
      // Scrolling up
      header.style.transform = "translateY(0)"
    }

    lastScrollTop = scrollTop
  })

  // Add scroll effect to header
  window.addEventListener("scroll", () => {
    if (window.scrollY > 50) {
      header.classList.add("scrolled")
    } else {
      header.classList.remove("scrolled")
    }
  })
})

// Brochure download function
function downloadBrochure() {
  // In a real implementation, this would link to an actual PDF file
  // For demo purposes, we'll show an alert and redirect to WhatsApp
  alert("Brochure download will start shortly. For immediate access, please contact us via WhatsApp.")

  // Create WhatsApp message for brochure request
  const message = encodeURIComponent(
    "Hi! I would like to download your product brochure. Please send me the latest catalog with pricing information.",
  )
  const whatsappURL = `https://wa.me/91XXXXXXXXXX?text=${message}`

  // Open WhatsApp in a new tab
  window.open(whatsappURL, "_blank")
}

// Lazy loading for images
document.addEventListener("DOMContentLoaded", () => {
  const images = document.querySelectorAll('img[src*="placeholder.svg"]')

  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target
        // In a real implementation, you would replace with actual image URLs
        img.classList.add("loaded")
        observer.unobserve(img)
      }
    })
  })

  images.forEach((img) => imageObserver.observe(img))
})

// Add loading animation
function showLoading() {
  const loader = document.createElement("div")
  loader.className = "loader"
  loader.innerHTML = '<div class="spinner"></div>'
  document.body.appendChild(loader)

  setTimeout(() => {
    document.body.removeChild(loader)
  }, 1000)
}

// Performance optimization - defer non-critical JavaScript
window.addEventListener("load", () => {
  // Add any non-critical functionality here
  console.log("100X Agricultural Equipment website loaded successfully!")
})

// Error handling for external resources
window.addEventListener("error", (e) => {
  console.warn("Resource failed to load:", e.target.src || e.target.href)
})

// Add CSS for header scroll effect
const style = document.createElement("style")
style.textContent = `
    .header {
        transition: transform 0.3s ease;
    }
    
    .header.scrolled {
        background-color: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
    }
    
    .loader {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 255, 255, 0.9);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
    }
    
    .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #27ae60;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`
document.head.appendChild(style)
