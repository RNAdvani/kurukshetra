import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import {Link} from "react-router-dom"
import { ModeToggle } from "../mood-toggle"

export default function Navbar() {
  return (
    <header className="flex h-20 w-full shrink-0 items-center px-4 md:px-6 bg-white border-b-2 border-black shadow-lg dark:bg-gray-900 dark:border-gray-700">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="lg:hidden">
            <MenuIcon className="h-6 w-6" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="dark:bg-gray-900 dark:text-white">
          <Link to="#" className="mr-6 hidden lg:flex">
            <MountainIcon className="h-6 w-6" />
            <span className="sr-only">Kurukshetra</span>
          </Link>
          <div className="grid gap-2 py-6">
            <Link to="#" className="flex w-full items-center py-2 text-lg font-semibold dark:text-white">
              Home
            </Link>
            <Link to="#" className="flex w-full items-center py-2 text-lg font-semibold dark:text-white">
              About
            </Link>
            <Link to="#" className="flex w-full items-center py-2 text-lg font-semibold dark:text-white">
              Services
            </Link>
            <Link to="#" className="flex w-full items-center py-2 text-lg font-semibold dark:text-white">
              Contact
            </Link>
          </div>
        </SheetContent>
      </Sheet>
      <Link to="/" className="mr-6 hidden lg:flex gap-1 items-center">
        <MountainIcon className="h-6 w-6" />
        <span className="font-semibold text-[24px] text-gray-900 dark:text-white">Kurukshetra</span>
      </Link>
      <nav className="ml-auto hidden lg:flex gap-6">
        <Link
          to="#"
          className="group inline-flex h-9 w-max items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:text-gray-900 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800 dark:hover:text-gray-300"
        >
          Home
        </Link>
        <Link
          to="#"
          className="group inline-flex h-9 w-max items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:text-gray-900 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800 dark:hover:text-gray-300"
        >
          About
        </Link>
        <Link
          to="#"
          className="group inline-flex h-9 w-max items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:text-gray-900 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800 dark:hover:text-gray-300"
        >
          Services
        </Link>
        <Link
          to="#"
          className="group inline-flex h-9 w-max items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:text-gray-900 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800 dark:hover:text-gray-300"
        >
          Contact
        </Link>
        <ModeToggle />
      </nav>
    </header>
  );
}

function MenuIcon(props:any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  )
}


function MountainIcon(props:any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m8 3 4 8 5-5 5 15H2L8 3z" />
    </svg>
  )
}