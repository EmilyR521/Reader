import { Component, EventEmitter, OnInit, OnDestroy, Output } from '@angular/core';
import { ThemeService } from '../../services/theme.service';
import { CoverLookupService } from '../../services/cover-lookup.service';
import { ReadingListService } from '../../services/reading-list.service';
import { UserService, User } from '../../services/user.service';
import { Subscription, combineLatest } from 'rxjs';

@Component({
  selector: 'app-settings-drawer',
  templateUrl: './settings-drawer.component.html',
  styleUrls: ['./settings-drawer.component.css']
})
export class SettingsDrawerComponent implements OnInit, OnDestroy {
  @Output() drawerClose = new EventEmitter<void>();

  isLookingUpData = false;
  isCsvExpanded = false;
  isLookupDataExpanded = false;
  lookupOptions = {
    covers: false,
    publicationDates: false
  };
  availableUsers: User[] = [];
  currentUser: string = '';
  newUserName: string = '';
  selectedIcon: string = '📚';
  showAddUserModal: boolean = false;
  isCreatingUser: boolean = false;
  availableEmojis: string[] = [
    '📚', '👤', '🌟', '🎯', '🔥', '💫', '⭐', '✨', '🎨', '🎭',
    '🎪', '🎬', '🎮', '🎲', '🎸', '🎺', '🎻', '🎤', '🎧', '🎵',
    '🏆', '🎁', '🎀', '🎈', '🎉', '🎊', '🎃', '🎄', '🎅', '🎁',
    '🌍', '🌎', '🌏', '🌐', '🌑', '🌒', '🌓', '🌔', '🌕', '🌖',
    '🌗', '🌘', '🌙', '🌚', '🌛', '🌜', '🌝', '🌞', '⭐', '🌟',
    '💫', '✨', '🔥', '💧', '🌊', '☀️', '🌤', '⛅', '🌥', '☁️',
    '🌦', '🌧', '⛈', '🌩', '⚡', '☔', '❄️', '☃️', '⛄', '🌨',
    '🌬', '💨', '🌪', '🌫', '🌈', '☂️', '☔', '🌂', '🌁', '🌃'
  ];
  private usersSubscription?: Subscription;

  constructor(
    public themeService: ThemeService,
    public userService: UserService,
    private coverLookupService: CoverLookupService,
    private readingListService: ReadingListService
  ) {}

  ngOnInit(): void {
    // Subscribe to both current user and available users to keep dropdown in sync
    this.usersSubscription = combineLatest([
      this.userService.currentUser$,
      this.userService.allUsers$
    ]).subscribe(([currentUser, users]) => {
      this.currentUser = currentUser;
      this.availableUsers = users;
      // Ensure dropdown reflects current user after users list loads
      setTimeout(() => {
        const select = document.getElementById('user-select') as HTMLSelectElement;
        if (select && currentUser) {
          select.value = currentUser;
        }
      }, 0);
    });
  }

  ngOnDestroy(): void {
    if (this.usersSubscription) {
      this.usersSubscription.unsubscribe();
    }
  }

  onUserChange(user: string): void {
    if (user === '__add_new__') {
      // Reset dropdown to current user
      setTimeout(() => {
        const select = document.getElementById('user-select') as HTMLSelectElement;
        if (select) {
          select.value = this.userService.getCurrentUser();
        }
      }, 0);
      this.showAddUserModal = true;
      // Focus input after modal is shown
      setTimeout(() => {
        const input = document.getElementById('new-user-name-input') as HTMLInputElement;
        if (input) {
          input.focus();
        }
      }, 100);
    } else if (user && user.trim()) {
      this.userService.setCurrentUser(user.trim());
      // Books will be reloaded automatically via ReadingListService subscription
    }
  }

  closeAddUserModal(): void {
    if (!this.isCreatingUser) {
      this.showAddUserModal = false;
      this.newUserName = '';
      this.selectedIcon = '📚';
    }
  }

  selectIcon(emoji: string): void {
    this.selectedIcon = emoji;
  }

  createNewUser(): void {
    if (!this.newUserName || !this.newUserName.trim() || this.isCreatingUser) {
      return;
    }

    const trimmedName = this.newUserName.trim();
    
    // Validate user name (basic validation - no empty, reasonable length)
    if (trimmedName.length === 0) {
      alert('User name cannot be empty.');
      return;
    }
    
    if (trimmedName.length > 50) {
      alert('User name must be 50 characters or less.');
      return;
    }
    
    // Check if user already exists
    const userExists = this.availableUsers.some(user => user.username === trimmedName);
    if (userExists) {
      alert(`User "${trimmedName}" already exists. Please choose a different name.`);
      return;
    }

    this.isCreatingUser = true;

    // Create user via API with icon
    this.userService.createUser(trimmedName, this.selectedIcon).subscribe({
      next: (newUser) => {
        // Set the new user as current
        this.userService.setCurrentUser(newUser.username);
        
        // Reload users list to include the new user
        this.userService.loadUsers();
        
        // Close modal and reset
        this.showAddUserModal = false;
        this.newUserName = '';
        this.selectedIcon = '📚';
        this.isCreatingUser = false;
        
        // Books will be reloaded automatically via ReadingListService subscription
      },
      error: (error) => {
        console.error('Error creating user:', error);
        alert('Failed to create user. Please try again.');
        this.isCreatingUser = false;
      }
    });
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  onThemeChange(theme: 'bookish-light' | 'bookish-dark' | 'minimal-light' | 'minimal-dark'): void {
    this.themeService.setTheme(theme);
  }

  toggleCsvSection(): void {
    this.isCsvExpanded = !this.isCsvExpanded;
  }

  toggleLookupDataSection(): void {
    this.isLookupDataExpanded = !this.isLookupDataExpanded;
  }

  toggleLookupOption(option: 'covers' | 'publicationDates'): void {
    this.lookupOptions[option] = !this.lookupOptions[option];
  }

  lookupData(): void {
    if (this.isLookingUpData) {
      return;
    }

    if (!this.lookupOptions.covers && !this.lookupOptions.publicationDates) {
      alert('Please select at least one lookup option.');
      return;
    }

    const books = this.readingListService.getBooks();
    let message = '';

    if (this.lookupOptions.covers) {
      const booksWithoutCovers = books.filter(book => !book.imageUrl);
      message += `Covers: ${booksWithoutCovers.length} book(s)`;
    }

    if (this.lookupOptions.publicationDates) {
      const booksWithoutDates = books.filter(book => !book.publishedDate);
      if (message) message += '\n';
      message += `Publication dates: ${booksWithoutDates.length} book(s)`;
    }

    if (!confirm(`Look up data for:\n${message}\n\nThis may take a few moments.`)) {
      return;
    }

    this.isLookingUpData = true;

    this.coverLookupService.lookupData(this.lookupOptions).subscribe({
      next: (results) => {
        this.isLookingUpData = false;
        let resultMessage = 'Lookup complete!\n\n';
        
        if (this.lookupOptions.covers && results.covers.total > 0) {
          resultMessage += `Covers: Found ${results.covers.found} out of ${results.covers.total}\n`;
        }
        
        if (this.lookupOptions.publicationDates && results.publicationDates.total > 0) {
          resultMessage += `Publication dates: Found ${results.publicationDates.found} out of ${results.publicationDates.total}`;
        }
        
        alert(resultMessage);
      },
      error: (error) => {
        console.error('Error during data lookup:', error);
        this.isLookingUpData = false;
        alert('An error occurred during data lookup. Please try again.');
      }
    });
  }

  close(): void {
    this.drawerClose.emit();
  }
}
