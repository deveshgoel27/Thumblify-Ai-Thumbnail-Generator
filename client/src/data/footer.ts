import type { IFooter } from "../types";

export const footerData: IFooter[] = [
    {
        title: "Pages",
        links: [
            { name: "Home", href: "#" },
            { name: "Generate", href: "#generate" },
            { name: "Recreate", href: "#recreate" },
            { name: "Community", href: "#community" },
        ]
    },
    {
        title: "Company",
        links: [
            { name: "About Us", href: "#aboutus" },
            { name: "Contact Us", href: "#contactus" },
            { name: "Pricing", href: "#pricing" },
        ]
    },
    {
        title: "Legal",
        links: [
            { name: "Privacy Policy", href: "#privacy" },
            { name: "Terms of Service", href: "#terms" },
            { name: "Refund Policy", href: "#refundpolicy" },
        ]
    }
];