/**
 * AddCompetitorDialog.tsx - Add Competitor Form Dialog
 *
 * Modal dialog for adding a new competitor to campaign:
 * - Competitor name (required)
 * - LinkedIn URL (optional)
 * - Twitter handle (optional)
 * - Blog URL (optional)
 * - Website URL (optional)
 */

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AddCompetitorRequest } from '../../../types/marketing';

interface AddCompetitorDialogProps {
  campaignId: string;
  onAdd: (request: AddCompetitorRequest) => void | Promise<void>;
  isLoading?: boolean;
}

export function AddCompetitorDialog({ campaignId, onAdd, isLoading }: AddCompetitorDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [twitterHandle, setTwitterHandle] = useState('');
  const [blogUrl, setBlogUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Competitor name is required';
    }

    // URL validation
    const urlPattern = /^https?:\/\/.+/;
    if (linkedinUrl && !urlPattern.test(linkedinUrl)) {
      newErrors.linkedinUrl = 'Invalid URL format (must start with http:// or https://)';
    }
    if (blogUrl && !urlPattern.test(blogUrl)) {
      newErrors.blogUrl = 'Invalid URL format (must start with http:// or https://)';
    }
    if (websiteUrl && !urlPattern.test(websiteUrl)) {
      newErrors.websiteUrl = 'Invalid URL format (must start with http:// or https://)';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const request: AddCompetitorRequest = {
      campaign_id: campaignId,
      name: name.trim(),
      ...(linkedinUrl && { linkedin_url: linkedinUrl.trim() }),
      ...(twitterHandle && { twitter_handle: twitterHandle.trim() }),
      ...(blogUrl && { blog_url: blogUrl.trim() }),
      ...(websiteUrl && { website_url: websiteUrl.trim() }),
    };

    await onAdd(request);

    // Reset form
    setName('');
    setLinkedinUrl('');
    setTwitterHandle('');
    setBlogUrl('');
    setWebsiteUrl('');
    setErrors({});
    setOpen(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset form when closing
      setName('');
      setLinkedinUrl('');
      setTwitterHandle('');
      setBlogUrl('');
      setWebsiteUrl('');
      setErrors({});
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-2)',
          }}
        >
          <Plus style={{ width: 'var(--spacing-4)', height: 'var(--spacing-4)' }} />
          <span>Add Competitor</span>
        </Button>
      </DialogTrigger>
      <DialogContent
        style={{
          maxWidth: '500px',
        }}
      >
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Competitor</DialogTitle>
          </DialogHeader>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-4)',
              paddingTop: 'var(--spacing-6)',
              paddingBottom: 'var(--spacing-6)',
            }}
          >
            {/* Name */}
            <div>
              <Label htmlFor="name">
                Competitor Name <span style={{ color: 'var(--color-error)' }}>*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Acme Corp"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'name-error' : undefined}
                style={{
                  marginTop: 'var(--spacing-2)',
                }}
              />
              {errors.name && (
                <p
                  id="name-error"
                  role="alert"
                  style={{
                    color: 'var(--color-error)',
                    fontSize: 'var(--font-size-sm)',
                    marginTop: 'var(--spacing-1)',
                  }}
                >
                  {errors.name}
                </p>
              )}
            </div>

            {/* LinkedIn URL */}
            <div>
              <Label htmlFor="linkedinUrl">LinkedIn Company URL</Label>
              <Input
                id="linkedinUrl"
                type="url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/company/..."
                aria-invalid={!!errors.linkedinUrl}
                aria-describedby={errors.linkedinUrl ? 'linkedin-error' : undefined}
                style={{
                  marginTop: 'var(--spacing-2)',
                }}
              />
              {errors.linkedinUrl && (
                <p
                  id="linkedin-error"
                  role="alert"
                  style={{
                    color: 'var(--color-error)',
                    fontSize: 'var(--font-size-sm)',
                    marginTop: 'var(--spacing-1)',
                  }}
                >
                  {errors.linkedinUrl}
                </p>
              )}
            </div>

            {/* Twitter Handle */}
            <div>
              <Label htmlFor="twitterHandle">Twitter/X Handle</Label>
              <Input
                id="twitterHandle"
                value={twitterHandle}
                onChange={(e) => setTwitterHandle(e.target.value)}
                placeholder="@username or username"
                style={{
                  marginTop: 'var(--spacing-2)',
                }}
              />
            </div>

            {/* Blog URL */}
            <div>
              <Label htmlFor="blogUrl">Blog URL</Label>
              <Input
                id="blogUrl"
                type="url"
                value={blogUrl}
                onChange={(e) => setBlogUrl(e.target.value)}
                placeholder="https://blog.example.com"
                aria-invalid={!!errors.blogUrl}
                aria-describedby={errors.blogUrl ? 'blog-error' : undefined}
                style={{
                  marginTop: 'var(--spacing-2)',
                }}
              />
              {errors.blogUrl && (
                <p
                  id="blog-error"
                  role="alert"
                  style={{
                    color: 'var(--color-error)',
                    fontSize: 'var(--font-size-sm)',
                    marginTop: 'var(--spacing-1)',
                  }}
                >
                  {errors.blogUrl}
                </p>
              )}
            </div>

            {/* Website URL */}
            <div>
              <Label htmlFor="websiteUrl">Website URL</Label>
              <Input
                id="websiteUrl"
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://www.example.com"
                aria-invalid={!!errors.websiteUrl}
                aria-describedby={errors.websiteUrl ? 'website-error' : undefined}
                style={{
                  marginTop: 'var(--spacing-2)',
                }}
              />
              {errors.websiteUrl && (
                <p
                  id="website-error"
                  role="alert"
                  style={{
                    color: 'var(--color-error)',
                    fontSize: 'var(--font-size-sm)',
                    marginTop: 'var(--spacing-1)',
                  }}
                >
                  {errors.websiteUrl}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Adding...' : 'Add Competitor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
